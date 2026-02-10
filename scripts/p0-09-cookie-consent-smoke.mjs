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

  const testPaths = ["/en", "/"];
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

async function assertMarkerAbsent(page) {
  const marker = page.locator('[data-analytics-gate="enabled"]');
  const count = await marker.count();
  assert(count === 0, "AnalyticsGate marker should be absent");
}

async function assertMarkerPresent(page) {
  const marker = page.locator('[data-analytics-gate="enabled"]');
  await marker.first().waitFor({ state: "attached", timeout: 15000 });
}

async function waitForCookieBanner(page) {
  // Banner is rendered only when there is no consent in localStorage.
  const acceptAll = page.getByRole("button", { name: /Accept all/i });
  await acceptAll.waitFor({ state: "visible", timeout: 20000 });
}

async function main() {
  const browser = await chromium.launch();
  try {
    // Resolve base URL once using a scratch page.
    {
      const page = await browser.newPage();
      baseURL = await resolveBaseURL(page);
      await page.close();
    }

    // Case 1: Reject analytics -> marker remains absent.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await gotoWithRetries(page, `${baseURL}/en`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await waitForCookieBanner(page);
      await assertMarkerAbsent(page);

      await page.getByRole("button", { name: /Only necessary/i }).click();
      await delay(600);
      await assertMarkerAbsent(page);

      await context.close();
      console.log("P0-09 ok: reject analytics keeps analytics disabled");
    }

    // Case 2: Accept all -> marker appears.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await gotoWithRetries(page, `${baseURL}/en`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await waitForCookieBanner(page);
      await assertMarkerAbsent(page);

      await page.getByRole("button", { name: /Accept all/i }).click();
      await assertMarkerPresent(page);

      await context.close();
      console.log("P0-09 ok: accept all enables analytics gate");
    }

    console.log("P0-09 cookie consent smoke all ok");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
