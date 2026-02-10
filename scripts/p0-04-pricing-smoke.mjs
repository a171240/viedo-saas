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

  const testPaths = ["/en/pricing", "/en", "/"];
  for (const candidate of candidates) {
    for (const testPath of testPaths) {
      try {
        const resp = await gotoWithRetries(
          page,
          `${candidate}${testPath}`,
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

async function clickTabAndWaitActive(page, nameRegex) {
  const button = page.getByRole("button", { name: nameRegex }).first();
  await button.waitFor({ state: "visible" });

  // Client components can render via SSR, but event handlers attach only after hydration.
  // Retry click until the active class toggles.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await button.click({ timeout: 20000 });
    await delay(250 + attempt * 150);
    const cls = (await button.getAttribute("class")) || "";
    if (cls.includes("bg-primary")) return;
  }

  const cls = (await button.getAttribute("class")) || "";
  throw new Error(`Tab did not activate: ${nameRegex} (class=${cls})`);
}

async function assertPricingPage(page, locale) {
  const isZh = locale === "zh";
  const labels = isZh
    ? {
        subscription: /订阅/i,
        creditPacks: /积分包/i,
        parallel: /并发任务/i,
        starterPackName: /入门积分包/i,
      }
    : {
        subscription: /Subscription/i,
        creditPacks: /Credit Packs/i,
        parallel: /Parallel tasks/i,
        starterPackName: /Starter Pack/i,
      };

  await gotoWithRetries(page, `${baseURL}/${locale}/pricing`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.getByRole("button", { name: labels.subscription }).waitFor();
  await page.getByRole("button", { name: labels.creditPacks }).waitFor();

  // Default tab should show plan specs, including the parallel tasks line.
  await page.getByText(labels.parallel).first().waitFor();

  // Switch to credit packs and ensure specs are still visible.
  await clickTabAndWaitActive(page, labels.creditPacks);
  // Ensure we actually switched tabs by waiting for a known credit-pack name.
  await page.getByText(labels.starterPackName).first().waitFor();
  await page.getByText(labels.parallel).first().waitFor();

  // Ensure "large" does not leak as an untranslated key.
  const rawLargeCount = await page.getByText(/^large$/i).count();
  assert(rawLargeCount === 0, `Untranslated key leak on /${locale}/pricing: "large"`);
}

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    baseURL = await resolveBaseURL(page);

    await assertPricingPage(page, "en");
    console.log("P0-04 pricing ok: /en/pricing");

    await assertPricingPage(page, "zh");
    console.log("P0-04 pricing ok: /zh/pricing");

    console.log("P0-04 pricing smoke all ok");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
