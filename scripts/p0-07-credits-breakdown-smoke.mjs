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

async function assertCreditsBreakdownPopover(page, locale) {
  await gotoWithRetries(page, `${baseURL}/${locale}/text-to-video`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitForReadableBody(page);

  // Wait for dev-bypass remounts to settle (if enabled).
  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/user/me"), { timeout: 15000 });
  } catch {
    // ignore
  }
  await delay(500);

  const trigger = page.getByRole("button", {
    name: /Credits breakdown|积分计算说明/i,
  }).first();
  await trigger.waitFor({ state: "visible" });
  await trigger.click();

  const backendFinal = locale === "zh"
    ? /最终扣费以后端为准/
    : /Final credits are calculated on the server/i;
  await page.getByText(backendFinal).first().waitFor({ timeout: 15000 });

  // "Base" label can be either a generic base label or base-with-seconds depending on model.
  const basePatterns = locale === "zh"
    ? [/基础积分/, /基础（\s*\d+\s*秒\s*）/]
    : [/Base credits/i, /Base\s*\(\s*\d+\s*s\s*\)/i];
  const baseCounts = await Promise.all(basePatterns.map((re) => page.getByText(re).count()));
  assert(
    baseCounts.some((c) => c > 0),
    `P0-07 missing base breakdown row on /${locale}/text-to-video`
  );

  const expected = locale === "zh"
    ? [
        /额外时长/,
        /分辨率倍率/,
        /预计总计/,
      ]
    : [
        /Extra seconds/i,
        /Resolution multiplier/i,
        /Estimated total/i,
      ];

  for (const re of expected) {
    const count = await page.getByText(re).count();
    assert(count > 0, `P0-07 missing breakdown label "${re}" on /${locale}/text-to-video`);
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
    await installCreditBalanceStub(page);

    baseURL = await resolveBaseURL(page);

    await assertCreditsBreakdownPopover(page, "en");
    console.log("P0-07 credits breakdown ok: /en/text-to-video");

    await assertCreditsBreakdownPopover(page, "zh");
    console.log("P0-07 credits breakdown ok: /zh/text-to-video");

    console.log("P0-07 credits breakdown smoke all ok");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
