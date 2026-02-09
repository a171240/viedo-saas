import { chromium } from "playwright";

let baseURL =
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3002";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function isConnIssue(error) {
  const msg = String(error?.message ?? "");
  return (
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
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
        await delay(1200 + attempt * 650);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`Failed to navigate: ${url}`);
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

  const probes = ["/en", "/"];
  for (const candidate of candidates) {
    for (const probe of probes) {
      try {
        const resp = await gotoWithRetries(
          page,
          `${candidate}${probe}`,
          { waitUntil: "domcontentloaded", timeout: 45000 },
          3
        );
        const status = resp?.status() ?? 0;
        if (status && status !== 404) return candidate;
      } catch {
        // ignore connection errors and try next candidate
      }
    }
  }

  throw new Error(
    `No reachable BASE_URL from candidates: ${candidates.join(", ")}`
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForReadableBody(page) {
  try {
    await page.waitForFunction(
      () => (document.body?.innerText || "").trim().length > 120,
      null,
      { timeout: 60000 }
    );
  } catch {
    await delay(1200);
  }
}

async function assertReferencePage(page, locale) {
  await gotoWithRetries(page, `${baseURL}/${locale}/reference-to-video`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitForReadableBody(page);

  const titleRegex =
    locale === "zh"
      ? /参考图生成视频/
      : /Turn Reference Images into Videos/i;
  await page.getByText(titleRegex).first().waitFor({ timeout: 60000 });

  const bodyText = await page.evaluate(() => document.body?.innerText || "");
  assert(
    !/reference video/i.test(bodyText),
    `P0-05 failed: found "reference video" copy on /${locale}/reference-to-video`
  );
  assert(
    !/参考视频/.test(bodyText),
    `P0-05 failed: found "参考视频" copy on /${locale}/reference-to-video`
  );

  // Ensure we accept images, not videos.
  const anyVideoAccept = await page.locator('input[type="file"][accept*="video"]').count();
  assert(anyVideoAccept === 0, `P0-05 failed: found file input accepting video on /${locale}/reference-to-video`);

  const fileInputs = page.locator('input[type="file"]');
  const inputCount = await fileInputs.count();
  assert(inputCount > 0, `P0-05 failed: missing file input on /${locale}/reference-to-video`);

  // Pick the first input that declares accept, and ensure it includes image.
  let accept = null;
  for (let i = 0; i < inputCount; i += 1) {
    const value = await fileInputs.nth(i).getAttribute("accept");
    if (value) {
      accept = value;
      break;
    }
  }
  assert(
    accept?.includes("image"),
    `P0-05 failed: expected accept to include "image" on /${locale}/reference-to-video, got ${accept}`
  );
}

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "vf_cookie_consent",
        JSON.stringify({
          necessary: true,
          analytics: false,
          updatedAt: new Date().toISOString(),
        })
      );
    });

    baseURL = await resolveBaseURL(page);

    await assertReferencePage(page, "en");
    console.log("P0-05 reference ok: /en/reference-to-video");

    await assertReferencePage(page, "zh");
    console.log("P0-05 reference ok: /zh/reference-to-video");

    console.log("P0-05 reference consistency smoke all ok");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
