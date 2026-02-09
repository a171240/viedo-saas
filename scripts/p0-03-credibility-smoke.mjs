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

async function assertHomeNoFakeStats(page, locale) {
  await gotoWithRetries(page, `${baseURL}/${locale}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitForReadableBody(page);

  // Use innerText to avoid matching strings embedded in <script> payloads (e.g. __NEXT_DATA__).
  const visibleText = await page.evaluate(() => document.body?.innerText || "");

  const timeRegex = locale === "zh" ? /2-5\s*分钟/ : /2-5\s*minutes/i;
  assert(
    timeRegex.test(visibleText),
    `P0-03 credibility failed on /${locale}: missing typical generation time`
  );

  // P0-03 focuses on removing unverifiable or placeholder stats. Allow the section to exist,
  // but block "0" placeholders and fake marketing numbers.
  const forbidden = locale === "zh"
    ? [
        /0\s*个视频已创建/,
        /0\s*位满意用户/,
        /0\s*用户评分/,
        /(1M\+|500K\+|100K\+|50K\+)/i,
        /\+500000/i,
        /0\s*(秒|分钟)\b/,
      ]
    : [
        /0\s*videos created/i,
        /0\s*happy users/i,
        /0\s*user rating/i,
        /(1M\+|500K\+|100K\+|50K\+)/i,
        /\+500000/i,
        /\b0\s*(s|min|p)\b/i,
      ];

  for (const re of forbidden) {
    assert(!re.test(visibleText), `P0-03 credibility failed on /${locale}: found "${re}"`);
  }
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

    await assertHomeNoFakeStats(page, "en");
    console.log("P0-03 credibility ok: /en");

    await assertHomeNoFakeStats(page, "zh");
    console.log("P0-03 credibility ok: /zh");

    console.log("P0-03 credibility smoke all ok");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
