import { chromium } from "playwright";

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

async function resolveBaseURL() {
  const candidates = uniq([
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://localhost:3001",
    "http://localhost:3002",
  ]);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const baseURL of candidates) {
    try {
      const resp = await page.goto(`${baseURL}/zh`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const status = resp?.status() ?? 0;
      if (status && status !== 404) {
        await browser.close();
        return baseURL;
      }
    } catch {
      // ignore connection errors
    }
  }

  await browser.close();
  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function analyzeText(text) {
  const han = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const englishWords = (text.match(/\b[A-Za-z]{4,}\b/g) || []).length;
  return { han, latin, englishWords };
}

function findBannedPhrase(text) {
  const banned = [
    // Auth
    "Welcome back",
    "Sign in to your account",
    "Continue with Email",
    "Continue with Google",
    "or continue with",
    // Cookie consent
    "Cookie preferences",
    "Necessary cookies",
    "Analytics cookies",
    "Accept all",
    "Only necessary",
    "Save preferences",
    "Cookie policy",
  ];
  for (const phrase of banned) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

async function main() {
  const baseURL = await resolveBaseURL();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Disable cookie banner for stable text capture.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "vf_cookie_consent",
      JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() })
    );
  });

  const paths = [
    "/zh",
    "/zh/pricing",
    "/zh/text-to-video",
    "/zh/image-to-video",
    "/zh/reference-to-video",
    "/zh/product-to-video",
    "/zh/login",
    "/zh/register",
    "/zh/cookies",
    "/zh/privacy",
    "/zh/terms",
  ];

  for (const path of paths) {
    const url = `${baseURL}${path}`;
      let resp = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
        // In Next dev, some pages can keep the main thread busy; "commit" is enough for HTML text checks.
        resp = await page.goto(url, { waitUntil: "commit", timeout: 120000 });
          break;
        } catch (error) {
          if (attempt < 3 && isConnIssue(error)) {
            // Next dev may auto-restart on memory pressure; give it time.
          await page.waitForTimeout(2000);
          continue;
        }
        throw error;
      }
    }
    const status = resp?.status() ?? 0;
    if (!status || status === 404) {
      throw new Error(`Expected route to exist but got status=${status} for ${url}`);
    }

    // Let dev streaming/hydration finish enough for translated strings to appear.
    // In Next dev, some routes may stream slowly; waiting on innerText length is more reliable than a fixed delay.
    try {
      await page.waitForFunction(
        () => (document.body?.innerText || "").trim().length > 80,
        null,
        { timeout: 60000 }
      );
    } catch {
      // fall back to fixed delay + second pass below
      await page.waitForTimeout(1200);
    }
    let text = await page.evaluate(() => document.body?.innerText || "");

    // If we captured an empty document (streaming not finished), retry with domcontentloaded once.
    let { han, latin, englishWords } = analyzeText(text);
    if (han === 0 && latin === 0) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForTimeout(800);
        text = await page.evaluate(() => document.body?.innerText || "");
      } catch {
        // keep the original text for diagnostics below
      }
    }

    const banned = findBannedPhrase(text);
    if (banned) {
      throw new Error(`Found banned English phrase "${banned}" on ${path}`);
    }

    ({ han, latin, englishWords } = analyzeText(text));
    if (han < 20) {
      // Occasionally hydration lags in dev; retry once before failing hard.
      await page.waitForTimeout(1200);
      text = await page.evaluate(() => document.body?.innerText || "");
      ({ han, latin, englishWords } = analyzeText(text));
    }
    // Heuristic: if there's a lot of Latin text relative to Chinese, it's likely a missing i18n segment.
    if (han < 20) {
      throw new Error(`Too few Chinese characters on ${path} (han=${han}, latin=${latin})`);
    }
    if (latin > 250 && latin > han * 0.6 && englishWords > 60) {
      throw new Error(
        `Likely English leakage on ${path} (han=${han}, latin=${latin}, englishWords=${englishWords})`
      );
    }

    console.log(`P0-06 zh smoke ok: ${path} (han=${han}, latin=${latin})`);
  }

  await browser.close();
  console.log("P0-06 zh smoke all ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
