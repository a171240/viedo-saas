import { chromium } from "playwright";

let baseURL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isConnIssue(error) {
  const msg = String(error?.message ?? error);
  return (
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
    msg.includes("ERR_CONNECTION_CLOSED") ||
    msg.includes("ERR_EMPTY_RESPONSE") ||
    msg.includes("ERR_TIMED_OUT") ||
    msg.includes("net::ERR_FAILED") ||
    msg.includes("Timeout")
  );
}

async function gotoWithRetries(page, url, options, attempts = 6) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isConnIssue(error)) {
        // Next dev can restart under memory pressure; wait and retry.
        await delay(1200 + attempt * 700);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`Failed to navigate: ${url}`);
}

async function resolveBaseURL(page) {
  const candidates = [
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const resp = await gotoWithRetries(
        page,
        `${candidate}/en`,
        { waitUntil: "domcontentloaded", timeout: 20000 },
        3
      );
      const status = resp?.status() ?? 0;
      if (status && status !== 404) return candidate;
    } catch {
      // ignore
    }
  }
  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

async function ensureHydrated(page) {
  const prompt = page.getByPlaceholder(/Describe the video|描述视频/i).first();
  const generate = page.getByRole("button", { name: /Generate Video|生成视频/i }).first();

  await prompt.waitFor({ state: "visible" });
  await generate.waitFor({ state: "visible" });

  const started = Date.now();
  while (!(await generate.isEnabled())) {
    if (Date.now() - started > 30000) {
      throw new Error("Hydration timeout: Generate never became enabled after typing prompt");
    }
    await prompt.fill("rate-limit-check");
    await delay(600);
  }
  await prompt.fill("P2 safeguard smoke test prompt");
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Disable cookie banner for stable click targets.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "vf_cookie_consent",
      JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() })
    );
  });

  // Keep tests independent from DB/auth: stub session + user + credits.
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "dev_user", email: "dev@example.com", name: "Dev User" },
      }),
    });
  });

  await page.route("**/api/v1/user/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { id: "dev_user", email: "dev@example.com", name: "Dev User" },
      }),
    });
  });

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

  const scenarios = [
    {
      reason: "parallel_limit",
      expectModal: true,
      toast: /concurrent task limit|并发任务已达上限/i,
    },
    {
      reason: "rate_limit",
      expectModal: false,
      toast: /Too many requests|请求过于频繁/i,
    },
    {
      reason: "daily_limit",
      expectModal: true,
      toast: /Daily generation limit reached|今日生成次数已达上限/i,
    },
    {
      reason: "cooldown",
      expectModal: false,
      toast: /short cooldown|冷却/i,
    },
  ];

  let scenarioIndex = 0;
  await page.route("**/api/v1/video/generate", async (route) => {
    const scenario = scenarios[scenarioIndex] || scenarios[scenarios.length - 1];
    scenarioIndex += 1;
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: {
          message: "Rate limited",
          details: { reason: scenario.reason },
        },
      }),
    });
  });

  baseURL = await resolveBaseURL(page);
  await gotoWithRetries(
    page,
    `${baseURL}/en/text-to-video`,
    { waitUntil: "commit", timeout: 120000 },
    6
  );
  await ensureHydrated(page);

  const generate = page.getByRole("button", { name: /Generate Video|生成视频/i }).first();

  for (const scenario of scenarios) {
    await generate.click();
    await page.getByText(scenario.toast).first().waitFor({ timeout: 15000 });

    if (scenario.expectModal) {
      const modal = page.getByRole("dialog").filter({ hasText: /Upgrade Your Plan|升级/i }).first();
      await modal.waitFor({ state: "visible", timeout: 15000 });
      const close = modal.getByRole("button", { name: /Close|关闭/i }).first();
      await close.waitFor({ state: "visible", timeout: 15000 });
      await close.click();
      try {
        await modal.waitFor({ state: "hidden", timeout: 15000 });
      } catch {
        // Some runs leave the dialog mounted briefly; ESC is a reliable fallback for Radix dialogs.
        await page.keyboard.press("Escape");
        await modal.waitFor({ state: "hidden", timeout: 15000 });
      }
    }
  }

  console.log("P2-03/P2-04 UI safeguards ok");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
