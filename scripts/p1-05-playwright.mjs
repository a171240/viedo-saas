import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

let baseURL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

const SEEDED_BRAND_KIT = {
  brandTone: "Premium and confident",
  styleSuffix: "cinematic lighting",
  bannedWords: "cheap, boring",
};

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function isConnIssue(error) {
  const msg = String(error?.message ?? "");
  return (
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
    msg.includes("net::ERR_FAILED") ||
    msg.includes("Target page, context or browser has been closed")
  );
}

async function gotoWithRetries(page, url, options = {}, attempts = 6) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isConnIssue(error)) {
        await delay(1200 + attempt * 600);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`Failed to navigate: ${url}`);
}

function ensureTestImage() {
  const filePath = path.join(os.tmpdir(), "vf-playwright-test.png");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, Buffer.from(TEST_IMAGE_BASE64, "base64"));
  }
  return filePath;
}

async function resolveBaseURL(page) {
  const candidates = uniq([
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://localhost:3001",
    "http://localhost:3002",
  ]);

  const testPaths = ["/en", "/"];
  for (const candidate of candidates) {
    for (const testPath of testPaths) {
      try {
        const resp = await gotoWithRetries(page, `${candidate}${testPath}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        const status = resp?.status() ?? 0;
        if (status && status !== 404) return candidate;
      } catch {
        // ignore connection errors and try next candidate
      }
    }
  }

  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

async function setLocalStorage(page, items) {
  await page.addInitScript((payload) => {
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, value);
    }
  }, items);
}

async function installCreditBalanceStub(page) {
  let balanceResponse = null;
  await page.route("**/api/v1/credit/balance", async (route) => {
    try {
      balanceResponse = await route.fetch();
      if (balanceResponse.ok()) {
        await route.fulfill({ response: balanceResponse });
        return;
      }
    } catch {
      // If dev server is restarting or flaky, still return a stable balance for UI assertions.
    }

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
  });
  return () => balanceResponse;
}

async function waitForCreditBalance(page) {
  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/credit/balance"), {
      timeout: 20000,
    });
    return true;
  } catch (error) {
    return null;
  }
}

async function ensureBrandKitToggle(page) {
  const toggle = page.getByRole("switch", { name: /Brand Kit|品牌套件/i });
  await toggle.waitFor({ state: "visible" });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const initial = await toggle.getAttribute("aria-checked");
    if (initial === "true") return;
    await toggle.click();
    await delay(350 + attempt * 150);
  }
  throw new Error("Brand Kit toggle did not become enabled");
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
  let lastError = null;
  for (const path of paths) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await gotoWithRetries(page, `${baseURL}${path}`, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        if (status && status !== 404) {
          return path;
        }
        if (status === 404) break;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && isConnIssue(error)) {
          await delay(300);
        }
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error(`No available route: ${paths.join(", ")}`);
}

async function assertBrandKitPreview(page, expectBrandKit) {
  const preview = await getPromptPreviewTextarea(page);
  await preview.waitFor({ state: "visible" });
  if (expectBrandKit) {
    await page.waitForFunction(
      (el) =>
        el?.value &&
        (el.value.includes("Brand tone:") ||
          el.value.includes("Style suffix:") ||
          el.value.includes("Avoid words:") ||
          el.value.includes("品牌语气：") ||
          el.value.includes("风格补充：") ||
          el.value.includes("避免用词：")),
      await preview.elementHandle()
    );
  }
  const value = await preview.inputValue();
  const hasBrandTone = value.includes("Brand tone:") || value.includes("品牌语气：");
  const hasStyleSuffix = value.includes("Style suffix:") || value.includes("风格补充：");
  const hasAvoidWords = value.includes("Avoid words:") || value.includes("避免用词：");
  if (expectBrandKit && (!hasBrandTone || !hasStyleSuffix || !hasAvoidWords)) {
    throw new Error("Brand Kit lines missing from prompt preview");
  }
  if (!expectBrandKit && (hasBrandTone || hasStyleSuffix || hasAvoidWords)) {
    throw new Error("Brand Kit lines still present after toggle off");
  }

  // Deeper assertions: ensure seeded values are present (English or Chinese).
  if (expectBrandKit) {
    const expectEn =
      value.includes(`Brand tone: ${SEEDED_BRAND_KIT.brandTone}`) &&
      value.includes(`Style suffix: ${SEEDED_BRAND_KIT.styleSuffix}`) &&
      value.includes("Avoid words: cheap, boring");
    const expectZh =
      value.includes(`品牌语气：${SEEDED_BRAND_KIT.brandTone}`) &&
      value.includes(`风格补充：${SEEDED_BRAND_KIT.styleSuffix}`) &&
      (value.includes("避免用词：cheap、boring") || value.includes("避免用词：cheap、 boring"));

    if (!expectEn && !expectZh) {
      throw new Error("Brand Kit preview does not include seeded values");
    }
  }
}

async function getPromptPreviewTextarea(page) {
  let preview = page.getByPlaceholder(/Fill in the form to generate a prompt preview|填写表单后将生成提示词预览/i);
  if (await preview.count() === 0) {
    const heading = page.getByRole("heading", { name: /Prompt preview|提示词预览/i });
    await heading.waitFor();
    preview = heading.locator("..").locator("textarea").first();
  }
  return preview;
}

async function openPromptStudio(page) {
  const trigger = page.getByRole("button", { name: /Prompt Studio|提示词工作室/i });
  try {
    await trigger.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    // On mobile layouts, generation can switch to the Result tab and hide the generator panel.
    // Bring the Generator tab back before retrying.
    const generatorTab = page.getByRole("button", { name: /Generator|生成器/i }).first();
    if ((await generatorTab.count()) > 0) {
      await generatorTab.click();
    }
    await trigger.waitFor({ state: "visible" });
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await trigger.click();
    const dialog = page.getByRole("dialog").first();
    try {
      await dialog.waitFor({ state: "visible", timeout: 1500 });
      await dialog.getByText(/Prompt Studio|提示词工作室/i).first().waitFor({ timeout: 15000 });
      return dialog;
    } catch {
      await delay(450 + attempt * 200);
    }
  }

  throw new Error("Prompt Studio dialog did not open");
}

async function closePromptStudio(dialog) {
  const closeButton = dialog.getByRole("button", { name: /close|关闭/i });
  await closeButton.click();
  await dialog.waitFor({ state: "hidden" });
}

async function selectTemplate(dialog, nameRegex) {
  const trigger = dialog.getByRole("combobox").first();
  await trigger.click();
  const patterns = Array.isArray(nameRegex) ? nameRegex : [nameRegex];
  for (const pattern of patterns) {
    const option = dialog.page().getByRole("option", { name: pattern });
    if ((await option.count()) > 0) {
      await option.first().click();
      return;
    }
  }
  await dialog.page().keyboard.press("Escape");
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

async function waitForBenefitsHint(page, count) {
  const countPattern = `${count}\\/5`;
  await page.waitForFunction((pattern) => {
    const text = document.body.textContent || "";
    return new RegExp(pattern).test(text) && (/benefits added/i.test(text) || /卖点/.test(text));
  }, countPattern);
}

async function fillPromptStudioBasics(dialog) {
  await dialog.getByRole("button", { name: /^1 / }).waitFor();
  await dialog.getByRole("button", { name: /^2 / }).waitFor();
  await dialog.getByRole("button", { name: /^3 / }).waitFor();
  await dialog.getByRole("button", { name: /^4 / }).waitFor();

  await selectTemplate(dialog, [/Product Ad/i, /商品广告/i]);

  await fillFieldByLabel(dialog, /Product name|产品名称/i, "Glow Serum");
  await fillFieldByLabel(dialog, /Target audience|目标受众/i, "Skincare beginners");
  await fillFieldByLabel(dialog, /Key benefits|核心卖点/i, "Hydration, Brightening, Soothing");
  await fillFieldByLabel(dialog, /CTA/i, "Shop now");

  const usePrompt = dialog.getByRole("button", { name: /Use this prompt|使用该提示词/i });
  if (await usePrompt.isEnabled()) {
    throw new Error("Use this prompt should be disabled before selecting platform/style");
  }

  await selectOptionByLabel(dialog, /Platform|平台/i, /TikTok/i);
  await selectOptionByLabel(dialog, /Style|风格/i, /UGC/i);

  const applyButton = dialog.getByRole("button", { name: /Use this prompt|使用该提示词/i });
  await applyButton.waitFor({ state: "visible" });
  if (!(await applyButton.isEnabled())) {
    throw new Error("Use this prompt should be enabled after filling required fields");
  }
}

async function assertPromptStudioInitialState(dialog) {
  await dialog.getByText(/Fill required fields to generate outputs|请先填写必填项以生成结果/i).waitFor();
  const applyButton = dialog.getByRole("button", { name: /Use this prompt|使用该提示词/i });
  if (await applyButton.isEnabled()) {
    throw new Error("Use this prompt should be disabled before required fields are filled");
  }
  const backButton = dialog.getByRole("button", { name: /Back|上一步/i });
  if (await backButton.isEnabled()) {
    throw new Error("Back should be disabled on the first step");
  }
}

function buildSelectedCountRegex(selected, expectedMax) {
  return new RegExp(`(Selected|已选)\\s*${selected}\\s*\\/\\s*${expectedMax}`);
}

async function assertSelectionLimit(dialog, expectedMax, extraAngleRegex) {
  await dialog.getByText(buildSelectedCountRegex(expectedMax, expectedMax)).waitFor();
  const extraAngle = dialog.getByRole("button", { name: extraAngleRegex }).first();
  await extraAngle.waitFor({ state: "visible" });
  await extraAngle.click();
  await dialog.getByText(buildSelectedCountRegex(expectedMax, expectedMax)).waitFor();
}

async function gotoPromptStudioStep(dialog, stepIndex) {
  await dialog.getByRole("button", { name: new RegExp(`^${stepIndex} `) }).click();
}

async function assertPromptStudioOutput(dialog, { product, audience, cta }) {
  await gotoPromptStudioStep(dialog, 1);
  await dialog.getByText(new RegExp(`${product}.*${audience}`)).waitFor();

  await gotoPromptStudioStep(dialog, 2);
  await dialog.getByText(new RegExp(`(Stop scrolling|别划走)[^\\n]*${product}`)).waitFor();

  await gotoPromptStudioStep(dialog, 4);
  const textareas = dialog.locator("textarea");
  const count = await textareas.count();
  let hasVideoPrompt = false;
  let hasNegativePrompt = false;
  for (let i = 0; i < count; i += 1) {
    const value = await textareas.nth(i).inputValue();
    if (value.includes(product) && (value.includes("Structure: Hook -> Value -> CTA") || value.includes("结构：吸引"))) {
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
  await dialog.getByText(buildSelectedCountRegex(selected, expectedMax)).waitFor();
  const queueButton = dialog.getByRole("button", { name: new RegExp(`(Queue|排队)\\s*${selected}`) });
  const enabled = await queueButton.isEnabled();
  if (queueEnabled !== enabled) {
    throw new Error(`Queue button enabled=${enabled} but expected ${queueEnabled}`);
  }
  if (requireImageHint) {
    await dialog.getByText(/Add an image to queue prompts|请先上传图片再批量排队/i).waitFor();
  }
}

async function assertBatchCountOptions(dialog) {
  const batchCombo = dialog.getByRole("combobox").filter({ hasText: /tasks|任务/i }).first();
  await batchCombo.click();
  await dialog.page().getByRole("option", { name: /3 tasks|3 个任务/ }).waitFor();
  await dialog.page().getByRole("option", { name: /5 tasks|5 个任务/ }).waitFor();
  await dialog.page().getByRole("option", { name: /10 tasks|10 个任务/ }).waitFor();
  await dialog.page().getByRole("option", { name: /5 tasks|5 个任务/ }).click();
}

async function assertCalendarStageAngles(dialog, label, minCount = 4) {
  const stageHeader = dialog.getByText(label);
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

async function readEstimatedCredits(page, variations) {
  const pattern = new RegExp(
    `(Estimated credits|预计消耗积分)\\s*\\(${variations}\\s*(variations|个变体)\\)[:：]\\s*(\\d+)`
  );
  const row = page.getByText(pattern).first();
  await row.waitFor();
  const text = await row.innerText();
  const m = text.match(pattern);
  if (!m) throw new Error(`Failed to parse estimated credits for variations=${variations} from: ${text}`);
  return Number.parseInt(m[3], 10);
}

async function assertGenerateButtonState(page, nameRegex, expectedEnabled) {
  const button = page.getByRole("button", { name: nameRegex });
  await button.waitFor({ state: "visible" });
  const enabled = await button.isEnabled();
  if (enabled !== expectedEnabled) {
    throw new Error(`Generate button enabled=${enabled} but expected ${expectedEnabled}`);
  }
}

async function waitForToast(page, messageRegex) {
  const toast = page.getByText(messageRegex).first();
  await toast.waitFor({ state: "visible" });
}

async function runPromptStudioTextToVideo(page) {
  const dialog = await openPromptStudio(page);
  await assertPromptStudioInitialState(dialog);
  await fillPromptStudioBasics(dialog);
  await assertPromptStudioOutput(dialog, {
    product: "Glow Serum",
    audience: "Skincare beginners",
    cta: "Shop now",
  });

  await gotoPromptStudioStep(dialog, 2);
  await gotoPromptStudioStep(dialog, 3);
  await assertCalendarStageAngles(dialog, /Acquire|获客/);
  await assertCalendarStageAngles(dialog, /Trust|建立信任/);
  await assertCalendarStageAngles(dialog, /Convert|转化/);
  await assertCalendarStageAngles(dialog, /Retain|留存/);

  await assertBatchCountOptions(dialog);
  await dialog.getByRole("button", { name: /Select top 5|选前 5 个/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 5, selected: 5, queueEnabled: true, requireImageHint: false });
  await assertSelectionLimit(dialog, 5, /Before\/After story|前后对比/i);
  await dialog.getByRole("button", { name: /Clear|清空/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 5, selected: 0, queueEnabled: false, requireImageHint: false });
  await dialog.getByRole("button", { name: /Select top 5|选前 5 个/i }).click();

  await dialog.getByRole("button", { name: /Use this prompt|使用该提示词/i }).click();
  await dialog.waitFor({ state: "hidden" });

  const promptInput = page.getByPlaceholder(/Describe the video|描述视频/i);
  await promptInput.waitFor({ state: "visible" });
  const promptValue = await promptInput.inputValue();
  if (!promptValue.includes("Glow Serum")) {
    throw new Error("Prompt Studio apply did not update prompt input");
  }
}

async function applyPromptStudioProductToVideo(page) {
  const dialog = await openPromptStudio(page);
  await assertPromptStudioInitialState(dialog);
  await fillPromptStudioBasics(dialog);
  await assertPromptStudioOutput(dialog, {
    product: "Glow Serum",
    audience: "Skincare beginners",
    cta: "Shop now",
  });

  await gotoPromptStudioStep(dialog, 2);
  await gotoPromptStudioStep(dialog, 3);
  await assertCalendarStageAngles(dialog, /Acquire|获客/);
  await assertCalendarStageAngles(dialog, /Trust|建立信任/);
  await assertCalendarStageAngles(dialog, /Convert|转化/);
  await assertCalendarStageAngles(dialog, /Retain|留存/);

  await dialog.getByRole("button", { name: /Select top 3|选前 3 个/i }).click();
  await assertBatchQueue(dialog, { expectedMax: 3, selected: 3, queueEnabled: false, requireImageHint: true });
  await assertSelectionLimit(dialog, 3, /POV/i);

  const imagePath = ensureTestImage();
  const multiImageInput = page.locator('input[type="file"][multiple][accept^="image"]');
  if ((await multiImageInput.count()) > 0) {
    await multiImageInput.first().setInputFiles(imagePath);
  } else {
    await page.setInputFiles('input[type="file"][accept^="image"]', imagePath);
  }
  await delay(500);
  await assertBatchQueue(dialog, { expectedMax: 3, selected: 3, queueEnabled: true, requireImageHint: false });

  await dialog.getByRole("button", { name: /Use this prompt|使用该提示词/i }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const browser = await chromium.launch({
    // Helps on some Linux runners where /dev/shm can be constrained.
    args: ["--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    // Force desktop breakpoints so generator panel stays visible after generation state changes.
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);

  // Disable cookie banner + seed brand kit
  await setLocalStorage(page, {
    vf_cookie_consent: JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() }),
    videofly_brand_kit: JSON.stringify({
      enabled: true,
      brandTone: SEEDED_BRAND_KIT.brandTone,
      styleSuffix: SEEDED_BRAND_KIT.styleSuffix,
      bannedWords: SEEDED_BRAND_KIT.bannedWords,
      defaultAspectRatio: "",
    }),
  });

  await installCreditBalanceStub(page);
  baseURL = await resolveBaseURL(page);
  await gotoFirstAvailable(page, ["/en/text-to-video", "/text-to-video"]);
  await waitForCreditBalance(page);
  // In dev-bypass mode, auth/credits queries can remount parts of the page; wait briefly for stability.
  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/user/me"), { timeout: 15000 });
  } catch {
    // ignore if bypass is disabled
  }
  await delay(600);

  // Prompt Studio button availability
  await page.getByRole("button", { name: /Prompt Studio|提示词工作室/i }).waitFor();

  // Brand Kit toggle verification (text-to-video)
  await ensureBrandKitToggle(page);

  // Generate button should be disabled without prompt or image
  await assertGenerateButtonState(page, /Generate Video|生成视频/i, false);

  // Fill prompt and attempt generation (requires login or dev bypass)
  await page.getByPlaceholder(/Describe the video|描述视频/i).fill("A sleek product demo in a modern studio");
  await assertGenerateButtonState(page, /Generate Video|生成视频/i, true);
  const readPayload = await captureGeneratePayload(page);
  await page.getByRole("button", { name: /Generate Video|生成视频/i }).click();

  // Wait briefly for either login redirect or generate request
  await delay(1200);
  const payload = readPayload();
  const redirectedToLogin = page.url().includes("/login");

  if (!redirectedToLogin && payload?.prompt) {
    const hasBrandTone = payload.prompt.includes("Brand tone:") || payload.prompt.includes("品牌语气：");
    const hasStyleSuffix = payload.prompt.includes("Style suffix:") || payload.prompt.includes("风格补充：");
    const hasAvoidWords = payload.prompt.includes("Avoid words:") || payload.prompt.includes("避免用词：");
    if (!hasBrandTone || !hasStyleSuffix) {
      throw new Error("Brand Kit lines not appended to prompt");
    }
    if (!hasAvoidWords) {
      throw new Error("Brand Kit banned words not appended to prompt");
    }

    // Value check (English-only here since we are on /en routes).
    if (
      !payload.prompt.includes(`Brand tone: ${SEEDED_BRAND_KIT.brandTone}`) ||
      !payload.prompt.includes(`Style suffix: ${SEEDED_BRAND_KIT.styleSuffix}`) ||
      !payload.prompt.includes("Avoid words: cheap, boring")
    ) {
      throw new Error("Brand Kit seeded values missing from generate payload");
    }
  }

  if (redirectedToLogin) {
    console.warn(
      `P1-05: redirected to login after clicking Generate (${page.url()}). Returning to tool page to continue UI checks.`
    );
    await gotoFirstAvailable(page, ["/en/text-to-video", "/text-to-video"]);
    await delay(900);
    await page.getByRole("button", { name: /Prompt Studio|提示词工作室/i }).waitFor();
  }

  await runPromptStudioTextToVideo(page);

  // Product-to-Video preview assertions (no auth required)
  await gotoFirstAvailable(page, ["/en/product-to-video", "/product-to-video"]);
  await delay(2000);
  await fillPageFieldByLabel(page, /Product name|产品名称/i, "Glow Serum");
  await fillPageFieldByLabel(page, /Target audience|目标受众/i, "Skincare beginners");
  await fillPageFieldByLabel(page, /Key benefits|核心卖点/i, "Hydration, Brightening, Soothing");
  await waitForBenefitsHint(page, 3);

  // Generate should surface image-required validation before upload
  await page.getByRole("button", { name: /^Generate$|生成/i }).click();
  await waitForToast(page, /Please upload at least 1 product image|请上传至少 1 张商品图片/i);

  // Brand Kit on -> preview contains appended lines
  await ensureBrandKitToggle(page);
  await delay(300);
  await assertBrandKitPreview(page, true);

  const credits3 = await readEstimatedCredits(page, 3);
  if (!(credits3 > 0)) {
    throw new Error(`Expected estimated credits for 3 variations to be > 0, got ${credits3}`);
  }
  await selectVariationCount(page, 5);
  const credits5 = await readEstimatedCredits(page, 5);
  if (!(credits5 > credits3)) {
    throw new Error(`Expected estimated credits to increase for 5 variations, got 3=${credits3} 5=${credits5}`);
  }
  await selectVariationCount(page, 10);
  const credits10 = await readEstimatedCredits(page, 10);
  if (!(credits10 > credits5)) {
    throw new Error(`Expected estimated credits to increase for 10 variations, got 5=${credits5} 10=${credits10}`);
  }

  // Prompt Studio -> apply prompt -> preview should update
  await applyPromptStudioProductToVideo(page);
  const preview = await getPromptPreviewTextarea(page);
  await preview.waitFor({ state: "visible" });
  const previewValue = await preview.inputValue();
  if (!previewValue || /Fill in the form|填写表单后将生成提示词预览/.test(previewValue)) {
    throw new Error("Prompt Studio did not update preview");
  }
  if (!(/Style:\s*UGC/i.test(previewValue) || /风格：.*UGC/.test(previewValue))) {
    throw new Error("Prompt Studio preview missing style tag");
  }
  if (
    !previewValue.includes("Structure: Hook -> Value -> CTA") &&
    !previewValue.includes("Storyboard:") &&
    !previewValue.includes("结构：吸引") &&
    !previewValue.includes("分镜：")
  ) {
    throw new Error("Prompt Studio preview missing script structure");
  }

  // Toggle off -> preview should drop Brand Kit lines
  const brandToggle = page.getByRole("switch", { name: /Brand Kit|品牌套件/i });
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
