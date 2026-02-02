import { chromium } from "playwright";

const baseURL = process.env.BASE_URL || "http://localhost:3001";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setLocalStorage(page, items) {
  await page.addInitScript((payload) => {
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, value);
    }
  }, items);
}

async function waitForCreditBalance(page) {
  let balanceResponse = null;
  await page.route("**/api/v1/credit/balance", async (route) => {
    balanceResponse = await route.fetch();
    if (!balanceResponse.ok()) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            totalCredits: 9999,
            usedCredits: 0,
            frozenCredits: 0,
            availableCredits: 9999,
            expiringSoon: 0,
          },
        }),
      });
      return;
    }
    await route.fulfill({ response: balanceResponse });
  });

  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/credit/balance"), {
      timeout: 8000,
    });
  } catch (error) {
    return null;
  }

  return balanceResponse;
}

async function ensureBrandKitToggle(page) {
  const toggle = page.getByRole("switch", { name: /Brand Kit/i });
  await toggle.waitFor({ state: "visible" });
  const initial = await toggle.getAttribute("aria-checked");
  if (initial !== "true") {
    await toggle.click();
    await delay(300);
  }
}

async function captureGeneratePayload(page) {
  let payload = null;
  await page.route("**/api/v1/video/generate", async (route) => {
    const body = route.request().postData();
    if (body) {
      payload = JSON.parse(body);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          videoUuid: "vid_test",
          taskId: "task_test",
          provider: "evolink",
          status: "PENDING",
          creditsUsed: 1,
        },
      }),
    });
  });
  return () => payload;
}

async function gotoFirstAvailable(page, paths) {
  for (const path of paths) {
    const response = await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    if (status && status !== 404) {
      return path;
    }
  }
  throw new Error(`No available route: ${paths.join(", ")}`);
}

async function assertBrandKitPreview(page, expectBrandKit) {
  const preview = await getPromptPreviewTextarea(page);
  await preview.waitFor({ state: "visible" });
  if (expectBrandKit) {
    await page.waitForFunction(
      (el) =>
        el &&
        el.value &&
        (el.value.includes("Brand tone:") ||
          el.value.includes("Style suffix:") ||
          el.value.includes("Avoid words:")),
      await preview.elementHandle()
    );
  }
  const value = await preview.inputValue();
  const hasBrandTone = value.includes("Brand tone:");
  const hasStyleSuffix = value.includes("Style suffix:");
  const hasAvoidWords = value.includes("Avoid words:");
  if (expectBrandKit && (!hasBrandTone || !hasStyleSuffix || !hasAvoidWords)) {
    throw new Error("Brand Kit lines missing from prompt preview");
  }
  if (!expectBrandKit && (hasBrandTone || hasStyleSuffix || hasAvoidWords)) {
    throw new Error("Brand Kit lines still present after toggle off");
  }
}

async function getPromptPreviewTextarea(page) {
  let preview = page.getByPlaceholder(/Fill in the form to generate a prompt preview/i);
  if (await preview.count() === 0) {
    const heading = page.getByRole("heading", { name: /Prompt preview/i });
    await heading.waitFor();
    preview = heading.locator("..").locator("textarea").first();
  }
  return preview;
}

async function openPromptStudio(page) {
  await page.getByRole("button", { name: /Prompt Studio/i }).click();
  const dialog = page.getByRole("dialog", { name: /Prompt Studio/i });
  await dialog.waitFor({ state: "visible" });
  return dialog;
}

async function selectTemplate(dialog, nameRegex) {
  const trigger = dialog.getByRole("combobox").first();
  await trigger.click();
  await dialog.page().getByRole("option", { name: nameRegex }).click();
}

async function fillFieldByLabel(dialog, labelRegex, value) {
  const label = dialog.locator("label", { hasText: labelRegex }).first();
  await label.waitFor();
  const container = label.locator("..");
  const input = container.locator("input, textarea").first();
  await input.fill(value);
}

async function selectOptionByLabel(dialog, labelRegex, optionRegex) {
  const label = dialog.locator("label", { hasText: labelRegex }).first();
  await label.waitFor();
  const container = label.locator("..");
  const combo = container.getByRole("combobox");
  await combo.click();
  await dialog.page().getByRole("option", { name: optionRegex }).click();
}

async function fillPageFieldByLabel(page, labelRegex, value) {
  const label = page.locator("label", { hasText: labelRegex }).first();
  await label.waitFor();
  const container = label.locator("..");
  const input = container.locator("input, textarea").first();
  await input.fill(value);
}

async function fillPromptStudioBasics(dialog) {
  await dialog.getByRole("button", { name: /1 Positioning/i }).waitFor();
  await dialog.getByRole("button", { name: /2 Angle Mining/i }).waitFor();
  await dialog.getByRole("button", { name: /3 4x4 Calendar/i }).waitFor();
  await dialog.getByRole("button", { name: /4 Script & Prompt/i }).waitFor();

  await selectTemplate(dialog, /Product Ad/i);

  await fillFieldByLabel(dialog, /Product name/i, "Glow Serum");
  await fillFieldByLabel(dialog, /Target audience/i, "Skincare beginners");
  await fillFieldByLabel(dialog, /Key benefits/i, "Hydration, Brightening, Soothing");
  await fillFieldByLabel(dialog, /CTA/i, "Shop now");

  const usePrompt = dialog.getByRole("button", { name: /Use this prompt/i });
  if (await usePrompt.isEnabled()) {
    throw new Error("Use this prompt should be disabled before selecting platform/style");
  }

  await selectOptionByLabel(dialog, /Platform/i, /TikTok/i);
  await selectOptionByLabel(dialog, /Style/i, /UGC/i);

  const applyButton = dialog.getByRole("button", { name: /Use this prompt/i });
  await applyButton.waitFor({ state: "visible" });
  if (!(await applyButton.isEnabled())) {
    throw new Error("Use this prompt should be enabled after filling required fields");
  }
}

async function gotoPromptStudioStep(dialog, stepIndex) {
  await dialog.getByRole("button", { name: new RegExp(`^${stepIndex} `) }).click();
}

async function assertPromptStudioOutput(dialog, { product, audience, cta }) {
  await gotoPromptStudioStep(dialog, 1);
  await dialog.getByText(new RegExp(`${product}.*${audience}`)).waitFor();

  await gotoPromptStudioStep(dialog, 2);
  await dialog.getByText(new RegExp(`Stop scrolling: ${product}`)).waitFor();

  await gotoPromptStudioStep(dialog, 4);
  const textareas = dialog.locator("textarea");
  const count = await textareas.count();
  let hasVideoPrompt = false;
  let hasNegativePrompt = false;
  for (let i = 0; i < count; i += 1) {
    const value = await textareas.nth(i).inputValue();
    if (value.includes(product) && value.includes("Structure: Hook -> Value -> CTA")) {
      hasVideoPrompt = true;
    }
    if (value.includes("blurry") && value.includes("low quality")) {
      hasNegativePrompt = true;
    }
  }
  if (!hasVideoPrompt) {
    throw new Error("Prompt Studio video prompt missing expected structure");
  }
  if (!hasNegativePrompt) {
    throw new Error("Prompt Studio negative prompt missing expected terms");
  }
  await dialog.getByText(new RegExp(cta, "i")).first().waitFor();
}

async function assertBatchQueue(dialog, { expectedMax, selected, queueEnabled, requireImageHint }) {
  await dialog.getByText(new RegExp(`Selected ${selected}/${expectedMax}`)).waitFor();
  const queueButton = dialog.getByRole("button", { name: new RegExp(`Queue ${selected}`) });
  const enabled = await queueButton.isEnabled();
  if (queueEnabled !== enabled) {
    throw new Error(`Queue button enabled=${enabled} but expected ${queueEnabled}`);
  }
  if (requireImageHint) {
    await dialog.getByText(/Add an image to queue prompts/i).waitFor();
  }
}

async function assertBatchCountOptions(dialog) {
  const batchCombo = dialog.getByRole("combobox").filter({ hasText: /tasks/i }).first();
  await batchCombo.click();
  await dialog.page().getByRole("option", { name: "3 tasks" }).waitFor();
  await dialog.page().getByRole("option", { name: "5 tasks" }).waitFor();
  await dialog.page().getByRole("option", { name: "10 tasks" }).waitFor();
  await dialog.page().getByRole("option", { name: "5 tasks" }).click();
}

async function assertCalendarStageAngles(dialog, label, minCount = 4) {
  const stageHeader = dialog.getByText(label, { exact: true });
  await stageHeader.waitFor();
  const stageBlock = stageHeader.locator("..");
  const angleCount = await stageBlock.getByRole("button").count();
  if (angleCount < minCount) {
    throw new Error(`Calendar stage "${label}" has only ${angleCount} angle buttons`);
  }
}

async function selectVariationCount(page, count) {
  const combo = page.getByRole("combobox").filter({ hasText: /variations/i }).first();
  await combo.click();
  await page.getByRole("option", { name: new RegExp(`^${count} variations$`) }).click();
}

async function assertEstimatedCredits(page, variations, expectedCredits) {
  const pattern = new RegExp(`Estimated credits \\(${variations} variations\\):\\s*${expectedCredits}`);
  await page.getByText(pattern).waitFor();
}

async function runPromptStudioTextToVideo(page) {
  const dialog = await openPromptStudio(page);
  await fillPromptStudioBasics(dialog);
  await assertPromptStudioOutput(dialog, {
    product: "Glow Serum",
    audience: "Skincare beginners",
    cta: "Shop now",
  });

  await gotoPromptStudioStep(dialog, 2);
  await gotoPromptStudioStep(dialog, 3);
  await assertCalendarStageAngles(dialog, "Acquire");
  await assertCalendarStageAngles(dialog, "Trust");
  await assertCalendarStageAngles(dialog, "Convert");
  await assertCalendarStageAngles(dialog, "Retain");

  await assertBatchCountOptions(dialog);
  await dialog.getByRole("button", { name: /Select top 5/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 5, selected: 5, queueEnabled: true, requireImageHint: false });
  await dialog.getByRole("button", { name: /Clear/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 5, selected: 0, queueEnabled: false, requireImageHint: false });
  await dialog.getByRole("button", { name: /Select top 5/i }).click();

  await dialog.getByRole("button", { name: /Use this prompt/i }).click();
  await dialog.waitFor({ state: "hidden" });

  const promptInput = page.getByPlaceholder(/Describe the video/i);
  await promptInput.waitFor({ state: "visible" });
  const promptValue = await promptInput.inputValue();
  if (!promptValue.includes("Glow Serum")) {
    throw new Error("Prompt Studio apply did not update prompt input");
  }
}

async function applyPromptStudioProductToVideo(page) {
  const dialog = await openPromptStudio(page);
  await fillPromptStudioBasics(dialog);
  await assertPromptStudioOutput(dialog, {
    product: "Glow Serum",
    audience: "Skincare beginners",
    cta: "Shop now",
  });

  await gotoPromptStudioStep(dialog, 2);
  await gotoPromptStudioStep(dialog, 3);
  await assertCalendarStageAngles(dialog, "Acquire");
  await assertCalendarStageAngles(dialog, "Trust");
  await assertCalendarStageAngles(dialog, "Convert");
  await assertCalendarStageAngles(dialog, "Retain");

  await dialog.getByRole("button", { name: /Select top 3/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 3, selected: 3, queueEnabled: false, requireImageHint: true });

  await dialog.getByRole("button", { name: /Use this prompt/i }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Disable cookie banner + seed brand kit
  await setLocalStorage(page, {
    vf_cookie_consent: JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() }),
    videofly_brand_kit: JSON.stringify({
      enabled: true,
      brandTone: "Premium and confident",
      styleSuffix: "cinematic lighting",
      bannedWords: "cheap, boring",
      defaultAspectRatio: "",
    }),
  });

  await gotoFirstAvailable(page, ["/en/text-to-video", "/text-to-video"]);
  await waitForCreditBalance(page);

  // Prompt Studio button availability
  await page.getByRole("button", { name: /Prompt Studio/i }).waitFor();

  // Brand Kit toggle verification (text-to-video)
  await ensureBrandKitToggle(page);

  // Fill prompt and attempt generation (requires login or dev bypass)
  await page.getByPlaceholder(/Describe the video/i).fill("A sleek product demo in a modern studio");
  const readPayload = await captureGeneratePayload(page);
  await page.getByRole("button", { name: /Generate Video/i }).click();

  // If redirected to login, skip strict payload assertion
  await delay(800);
  if (!page.url().includes("/login")) {
    const payload = readPayload();
    if (!payload?.prompt) {
      throw new Error("Generate payload missing prompt");
    }
    if (!payload.prompt.includes("Brand tone:") || !payload.prompt.includes("Style suffix:")) {
      throw new Error("Brand Kit lines not appended to prompt");
    }
  }

  await runPromptStudioTextToVideo(page);

  // Product-to-Video preview assertions (no auth required)
  await gotoFirstAvailable(page, ["/en/product-to-video", "/product-to-video"]);
  await fillPageFieldByLabel(page, /Product name/i, "Glow Serum");
  await fillPageFieldByLabel(page, /Target audience/i, "Skincare beginners");
  await fillPageFieldByLabel(page, /Key benefits/i, "Hydration, Brightening, Soothing");

  // Brand Kit on -> preview contains appended lines
  await ensureBrandKitToggle(page);
  await delay(300);
  await assertBrandKitPreview(page, true);

  await assertEstimatedCredits(page, 3, 252);
  await selectVariationCount(page, 5);
  await assertEstimatedCredits(page, 5, 420);
  await selectVariationCount(page, 10);
  await assertEstimatedCredits(page, 10, 840);

  // Prompt Studio -> apply prompt -> preview should update
  await applyPromptStudioProductToVideo(page);
  const preview = await getPromptPreviewTextarea(page);
  await preview.waitFor({ state: "visible" });
  const previewValue = await preview.inputValue();
  if (!previewValue || previewValue.includes("Fill in the form")) {
    throw new Error("Prompt Studio did not update preview");
  }
  if (!previewValue.includes("Style: UGC")) {
    throw new Error("Prompt Studio preview missing style tag");
  }
  if (!previewValue.includes("Structure: Hook -> Value -> CTA") && !previewValue.includes("Storyboard:")) {
    throw new Error("Prompt Studio preview missing script structure");
  }

  // Toggle off -> preview should drop Brand Kit lines
  const brandToggle = page.getByRole("switch", { name: /Brand Kit/i });
  await brandToggle.click();
  await delay(300);
  await assertBrandKitPreview(page, false);

  console.log("P1-05 automation prep ok");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
