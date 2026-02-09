import path from "node:path";
import dotenv from "dotenv";
import { chromium } from "playwright";
import { nanoid } from "nanoid";

import { eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

let dbPromise: Promise<typeof import("@/db")> | null = null;
async function getDb() {
  if (!dbPromise) {
    // Defer DB import until after dotenv loads DATABASE_URL.
    dbPromise = import("@/db");
  }
  return dbPromise;
}

let baseURL =
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3002";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function uniq(items: Array<string | undefined | null>) {
  return [...new Set(items.filter(Boolean))] as string[];
}

function isConnIssue(error: unknown) {
  const msg = String((error as { message?: string })?.message ?? "");
  return (
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
    msg.includes("net::ERR_FAILED") ||
    msg.includes("Target page, context or browser has been closed")
  );
}

async function gotoWithRetries(
  page: import("playwright").Page,
  url: string,
  options: Parameters<import("playwright").Page["goto"]>[1],
  attempts = 8
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isConnIssue(error)) {
        await delay(1200 + attempt * 650);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`Failed to navigate: ${url}`);
}

async function resolveBaseURL(page: import("playwright").Page) {
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
        // ignore and try next candidate
      }
    }
  }

  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function clickRemixAndWait(page: import("playwright").Page, expectedPath: RegExp) {
  const remix = page.getByRole("button", { name: /Remix|再编辑/i }).first();
  await remix.waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await remix.click({ timeout: 20000 });
    try {
      await page.waitForURL(expectedPath, { timeout: 6000 });
      return;
    } catch {
      await delay(450 + attempt * 200);
    }
  }

  throw new Error(`Remix navigation did not reach ${expectedPath} (current=${page.url()})`);
}

async function waitForDevBypassStability(page: import("playwright").Page) {
  try {
    await page.waitForResponse((resp) => resp.url().includes("/api/v1/user/me"), { timeout: 15000 });
  } catch {
    // ignore if bypass is disabled
  }
  await delay(700);
}

async function insertShareVideoRow(row: {
  uuid: string;
  prompt: string;
  model: string;
  mode: string;
  duration?: number;
  aspectRatio?: string;
  quality?: string;
  startImageUrl?: string | null;
}) {
  const { db, videos, VideoStatus } = await getDb();
  await db.insert(videos).values({
    uuid: row.uuid,
    userId: "ci_share_user",
    prompt: row.prompt,
    model: row.model,
    status: VideoStatus.COMPLETED,
    provider: "evolink",
    duration: row.duration ?? null,
    aspectRatio: row.aspectRatio ?? null,
    resolution: row.quality ?? null,
    startImageUrl: row.startImageUrl ?? null,
    parameters: {
      mode: row.mode,
      duration: row.duration,
      aspectRatio: row.aspectRatio,
      quality: row.quality,
      outputNumber: 1,
    },
    creditsUsed: 1,
  });
}

async function cleanup(uuid: string) {
  const { db, videos } = await getDb();
  await db.delete(videos).where(eq(videos.uuid, uuid));
}

async function assertToolPagePrefill(page: import("playwright").Page, expectedPrompt: string) {
  await waitForDevBypassStability(page);

  const promptInput = page.getByPlaceholder(/Describe the video|描述视频/i).first();
  await promptInput.waitFor({ state: "visible" });

  const started = Date.now();
  while (true) {
    const value = (await promptInput.inputValue()) || "";
    if (value.includes(expectedPrompt)) return;
    if (Date.now() - started > 20000) {
      throw new Error(`Tool prefill mismatch: expected prompt to include "${expectedPrompt}", got "${value}"`);
    }
    await delay(300);
  }
}

async function assertProductToVideoPrefill(page: import("playwright").Page, expectedPrompt: string) {
  await waitForDevBypassStability(page);

  // Product-to-video uses a preview textarea (read-only) that should reflect the remix prompt override.
  const heading = page.getByRole("heading", { name: /Prompt preview|提示词预览/i }).first();
  await heading.waitFor({ state: "visible" });
  const preview = heading.locator("..").locator("textarea").first();
  await preview.waitFor({ state: "visible" });

  const started = Date.now();
  while (true) {
    const value = (await preview.inputValue()) || "";
    if (value.includes(expectedPrompt)) return;
    if (Date.now() - started > 25000) {
      throw new Error(`Product-to-video prefill mismatch: expected prompt to include "${expectedPrompt}", got "${value}"`);
    }
    await delay(350);
  }
}

async function main() {
  const uuids: string[] = [];
  const browser = await chromium.launch({
    args: ["--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(120000);

    // Disable cookie banner for stable interactions.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "vf_cookie_consent",
        JSON.stringify({ necessary: true, analytics: false, updatedAt: new Date().toISOString() })
      );
    });

    baseURL = await resolveBaseURL(page);

    // 1) Share -> Remix -> Tool page prefill
    {
      const uuid = `vid_share_tool_${nanoid(10)}`;
      uuids.push(uuid);
      const prompt = `Share remix tool prompt ${uuid}`;
      await insertShareVideoRow({
        uuid,
        prompt,
        model: "wan2.6",
        mode: "text-to-video",
        duration: 10,
        aspectRatio: "9:16",
      });

      await gotoWithRetries(page, `${baseURL}/en/share/${uuid}`, { waitUntil: "domcontentloaded", timeout: 120000 }, 4);
      await clickRemixAndWait(page, /\/en\/text-to-video/);
      await assertToolPagePrefill(page, prompt);
      console.log("P1-06 ok: share -> remix -> text-to-video prefill");
    }

    // 2) Share -> Remix -> Product-to-video prefill (prompt preview)
    {
      const uuid = `vid_share_product_${nanoid(10)}`;
      uuids.push(uuid);
      const prompt = `Share remix product prompt ${uuid}`;
      await insertShareVideoRow({
        uuid,
        prompt,
        model: "wan2.6",
        mode: "product-to-video",
        duration: 15,
        aspectRatio: "9:16",
        startImageUrl: "https://example.com/vf-share-remix.png",
      });

      await gotoWithRetries(page, `${baseURL}/en/share/${uuid}`, { waitUntil: "domcontentloaded", timeout: 120000 }, 4);
      await clickRemixAndWait(page, /\/en\/product-to-video/);
      await assertProductToVideoPrefill(page, prompt);
      console.log("P1-06 ok: share -> remix -> product-to-video prefill");
    }

    console.log("P1-06 share/remix regression all ok");
  } finally {
    for (const uuid of uuids) {
      try {
        await cleanup(uuid);
      } catch {
        // best-effort cleanup for local runs
      }
    }
    await browser.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
