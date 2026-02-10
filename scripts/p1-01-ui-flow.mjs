import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

let baseURL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function isConnIssue(error) {
  const msg = String(error?.message ?? "");
  return (
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
    msg.includes("ERR_CONNECTION_CLOSED") ||
    msg.includes("ERR_EMPTY_RESPONSE") ||
    msg.includes("ERR_TIMED_OUT") ||
    msg.includes("net::ERR_FAILED")
  );
}

async function gotoWithRetries(page, url, options, attempts = 8) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isConnIssue(error)) {
        // Next dev can restart under memory pressure; wait and retry.
        await delay(1500 + attempt * 700);
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
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);

  for (const candidate of candidates) {
    try {
      const resp = await gotoWithRetries(page, `${candidate}/en`, { waitUntil: "domcontentloaded", timeout: 15000 });
      const status = resp?.status() ?? 0;
      if (status && status !== 404) return candidate;
    } catch {
      // keep trying
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

async function installLocalStorageReset(page) {
  await page.addInitScript(() => {
    const prefixes = ["videofly_video_history:", "videofly_video_tasks:"];
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (prefixes.some((p) => key.startsWith(p))) window.localStorage.removeItem(key);
    }
  });
}

async function installCreditBalanceStub(page) {
  await page.route("**/api/v1/credit/balance", async (route) => {
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
}

async function installAuthStubs(page) {
  const user = { id: "dev_user", email: "dev@example.com", name: "Dev User" };

  // Make UI regressions independent from real auth/dev-bypass availability. This keeps the
  // scripts runnable against deployed environments where bypass is disabled.
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // better-auth get-session returns a session object (or null), not an envelope.
      body: JSON.stringify({ user }),
    });
  });

  await page.route("**/api/v1/user/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: user }),
    });
  });
}

async function installUploadStub(page) {
  await page.route("**/api/v1/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          publicUrl: "https://example.com/vf-playwright-test.png",
        },
      }),
    });
  });
}

async function installGenerateStub(page) {
  const payloads = [];
  let counter = 0;

  await page.route("**/api/v1/video/generate", async (route) => {
    const body = route.request().postData();
    if (body) {
      try {
        payloads.push(JSON.parse(body));
      } catch {
        // ignore
      }
    }

    counter += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          videoUuid: `vid_test_${counter}`,
          taskId: `task_test_${counter}`,
          provider: "evolink",
          status: "PENDING",
          creditsUsed: 1,
        },
      }),
    });
  });

  return payloads;
}

async function openPromptStudio(page) {
  await page.getByRole("button", { name: /Prompt Studio|提示词工作室/i }).click();
  // Radix Dialog uses aria-labelledby; in dev it can be flaky to match by name.
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible" });
  await dialog.getByText(/Prompt Studio|提示词工作室/i).first().waitFor({ timeout: 15000 });
  return dialog;
}

async function gotoPromptStudioStep(dialog, stepIndex) {
  await dialog.getByRole("button", { name: new RegExp(`^${stepIndex} `) }).click();
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

  await selectOptionByLabel(dialog, /Platform|平台/i, /TikTok/i);
  await selectOptionByLabel(dialog, /Style|风格/i, /UGC/i);
}

function parseAngle(prompt) {
  const m = /Angle:\s*([^\n.]+)\.?/.exec(prompt);
  return m?.[1]?.trim() ?? null;
}

async function getVideoHistoryItems(page) {
  const keys = await page.evaluate(() => {
    const results = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) results.push(key);
    }
    return results;
  });
  const historyKey = keys.find((k) => k.startsWith("videofly_video_history:"));
  if (!historyKey) return [];
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), historyKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function assertBatchQueuePrompts(page, payloads, expectedCount) {
  if (payloads.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} generate calls, got ${payloads.length}`);
  }

  const prompts = payloads.map((p) => p?.prompt).filter(Boolean);
  const uniquePrompts = new Set(prompts);
  if (uniquePrompts.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} unique prompts, got ${uniquePrompts.size}`);
  }

  const angles = prompts.map(parseAngle).filter(Boolean);
  const uniqueAngles = new Set(angles);
  if (uniqueAngles.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} unique angles in prompts, got ${uniqueAngles.size}`);
  }

  const history = await getVideoHistoryItems(page);
  const last = history.slice(-expectedCount);
  if (last.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} items in history (tail), got ${last.length}`);
  }

  const lastPrompts = last.map((item) => item?.prompt).filter(Boolean);
  const uniqueLast = new Set(lastPrompts);
  if (uniqueLast.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} unique prompts in history, got ${uniqueLast.size}`);
  }
}

async function waitForGeneratePayloads(payloads, expectedCount, timeoutMs = 20000) {
  const started = Date.now();
  while (payloads.length < expectedCount) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for ${expectedCount} generate calls, got ${payloads.length}`);
    }
    await delay(200);
  }
}

async function waitForEnabled(locator, timeoutMs = 15000) {
  const started = Date.now();
  while (!(await locator.isEnabled())) {
    if (Date.now() - started > timeoutMs) {
      return false;
    }
    await delay(200);
  }
  return true;
}

async function ensureHydratedInput(locator, timeoutMs = 30000) {
  const started = Date.now();
  while (true) {
    await locator.fill("hydration-check");
    await delay(700);
    const value = await locator.inputValue();
    if (value === "hydration-check") return;
    if (Date.now() - started > timeoutMs) {
      throw new Error("Hydration timeout: controlled input kept resetting");
    }
  }
}

async function ensureGeneratorHydrated(page, timeoutMs = 30000) {
  // Open the model dropdown. If React isn't hydrated yet, this click won't do anything.
  const trigger = page.getByRole("button", { name: /Wan 2\.6|Sora 2|Veo 3\.1|Seedance/i }).first();
  await trigger.waitFor({ state: "visible" });
  const started = Date.now();
  while (true) {
    await trigger.click();
    const firstItem = page.locator("[data-model-id]").first();
    try {
      await firstItem.waitFor({ state: "visible", timeout: 1500 });
      await page.keyboard.press("Escape");
      return;
    } catch {
      // keep trying until hydrated
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error("Hydration timeout: model dropdown never became interactive");
    }
    await delay(500);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await installLocalStorageReset(page);
  await setLocalStorage(page, {
    vf_cookie_consent: JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() }),
  });

  await installAuthStubs(page);
  await installCreditBalanceStub(page);
  await installUploadStub(page);
  const payloads = await installGenerateStub(page);

  baseURL = await resolveBaseURL(page);

  // 1) text-to-video: Prompt Studio batch queue -> 3 tasks -> prompts differ
  await gotoWithRetries(page, `${baseURL}/en/text-to-video`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("button", { name: /Prompt Studio|提示词工作室/i }).waitFor();
  // In dev-bypass mode, the layout can switch from unauth -> auth after /api/v1/user/me resolves,
  // which remounts the generator and clears any early typing. Wait a bit to avoid flakiness.
  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/user/me"), { timeout: 15000 });
  } catch {
    // ignore if bypass is disabled
  }
  await delay(800);

  // Ensure client hydration so the dialog trigger is interactive in dev.
  const hydrationProbe = page.getByPlaceholder(/Describe the video|描述视频/i);
  const hydrationGenerate = page.getByRole("button", { name: /Generate Video|生成视频/i }).first();
  await hydrationProbe.waitFor({ state: "visible" });
  await hydrationGenerate.waitFor({ state: "visible" });
  await ensureGeneratorHydrated(page);
  const startedHydration = Date.now();
  while (true) {
    if (Date.now() - startedHydration > 60000) {
      throw new Error("Hydration timeout: Generate button never became enabled after typing prompt");
    }
    // If we typed before hydration, React may later overwrite the value back to empty.
    // Re-typing makes this gate reliable in dev.
    await hydrationProbe.fill("hydration-check");
    await delay(900);
    const stable = (await hydrationProbe.inputValue()) === "hydration-check";
    if (stable && (await hydrationGenerate.isEnabled())) {
      break;
    }
  }
  await hydrationProbe.fill("");

  const dialog = await openPromptStudio(page);
  await fillPromptStudioBasics(dialog);
  await gotoPromptStudioStep(dialog, 3);

  // Queue top 3 angles as batch tasks.
  await dialog.getByRole("button", { name: /Select top 3|选前 3 个/i }).click();
  await dialog.getByText(/(Selected|已选)\s*3\s*\/\s*3/i).waitFor({ timeout: 15000 });

  await dialog.getByRole("button", { name: /(Queue|排队)\s*3/i }).click();
  await dialog.waitFor({ state: "hidden" });
  await waitForGeneratePayloads(payloads, 3);

  // Give the UI a moment to flush localStorage/history renders.
  await delay(500);
  await assertBatchQueuePrompts(page, payloads, 3);

  // 2) image-to-video: requires image upload and generates with imageUrl
  await gotoWithRetries(page, `${baseURL}/en/image-to-video`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const imagePrompt = page.getByPlaceholder(/Describe the video|描述视频/i);
  await imagePrompt.waitFor({ state: "visible" });
  await ensureGeneratorHydrated(page);
  await imagePrompt.fill("A quick before/after product demo");
  const genButton = page.getByRole("button", { name: /Generate Video|生成视频/i });
  await genButton.waitFor({ state: "visible" });
  if (await genButton.isEnabled()) {
    throw new Error("Generate should be disabled before uploading image in image-to-video");
  }

  const imagePath = ensureTestImage();
  const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
  await fileInput.waitFor({ state: "attached" });
  await fileInput.setInputFiles(imagePath);
  // Optional debug artifact (kept out of git via .gitignore).
  if (process.env.ARTIFACTS === "1") {
    const artifactDir = path.join(process.cwd(), "scripts", ".artifacts");
    fs.mkdirSync(artifactDir, { recursive: true });
    try {
      await page.screenshot({
        path: path.join(artifactDir, "p1-01-image-upload.png"),
        fullPage: true,
        timeout: 5000,
      });
    } catch {
      // Non-blocking; screenshots can hang on font loading in dev.
    }
  }
  // Wait for UI to reflect the selected file (file name chip or preview).
  await page.getByText(/vf-playwright-test\.png/i).waitFor({ timeout: 15000 });

  // In dev, hydration can wipe prompt value after our initial fill; enforce it.
  if (!((await imagePrompt.inputValue()) || "").trim()) {
    await imagePrompt.fill("A quick before/after product demo");
  }

  const enabled = await waitForEnabled(genButton, 20000);
  if (!enabled) {
    const currentValue = (await imagePrompt.inputValue()).trim();
    throw new Error(
      `Generate should be enabled after uploading image in image-to-video (prompt="${currentValue}", hasFileChip=${await page.getByText(/vf-playwright-test\\.png/i).isVisible()})`
    );
  }

  const beforeImageGenerate = payloads.length;
  const imageReq = page.waitForRequest((req) => req.url().includes("/api/v1/video/generate"), { timeout: 15000 });
  await genButton.click();
  await imageReq;
  await waitForGeneratePayloads(payloads, beforeImageGenerate + 1);

  const lastPayload = payloads[payloads.length - 1];
  if (!lastPayload?.imageUrl && !(Array.isArray(lastPayload?.imageUrls) && lastPayload.imageUrls.length)) {
    throw new Error(
      `Expected imageUrl/imageUrls in generate payload for image-to-video, got: ${JSON.stringify(lastPayload)}`
    );
  }

  console.log("P1-01 UI/flow regression ok");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
