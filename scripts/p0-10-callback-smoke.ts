import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; details?: unknown } };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isConnIssue(error: unknown): boolean {
  const err = error as { message?: string; cause?: unknown } | null;
  const msg = String(err?.message ?? "");
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("ERR_CONNECTION_RESET") ||
    msg.includes("fetch failed")
  ) {
    return true;
  }

  const cause = err?.cause as { code?: string; errors?: Array<{ code?: string }> } | null;
  const code = cause?.code;
  if (code && ["ECONNREFUSED", "ECONNRESET", "EPIPE", "UND_ERR_SOCKET"].includes(code)) return true;
  const nested = Array.isArray(cause?.errors) ? cause?.errors : [];
  return nested.some((e) => e?.code && ["ECONNREFUSED", "ECONNRESET", "EPIPE", "UND_ERR_SOCKET"].includes(e.code));
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  attempts = 6
): Promise<{ status: number; json: ApiResponse<T> }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const resp = await fetch(url, init);
      const json = (await resp.json()) as ApiResponse<T>;
      return { status: resp.status, json };
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isConnIssue(error)) {
        // Next dev can auto-restart under memory pressure; wait and retry.
        await delay(900 + attempt * 700);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`fetchJson failed: ${url}`);
}

function uniq(items: Array<string | undefined | null>) {
  return [...new Set(items.filter(Boolean))] as string[];
}

async function resolveBaseURL() {
  const candidates = uniq([
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);

  const probes = ["/en", "/"];
  for (const baseURL of candidates) {
    for (const probe of probes) {
      try {
        const resp = await fetch(`${baseURL}${probe}`, { redirect: "manual" });
        const status = resp.status;
        if (status && status !== 404) return baseURL;
      } catch {
        // ignore connection errors
      }
    }
  }

  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function getCallbackSecret(): string {
  const secret = process.env.AI_CALLBACK_SECRET ?? process.env.CALLBACK_HMAC_SECRET;
  if (!secret) {
    throw new Error("Missing AI_CALLBACK_SECRET/CALLBACK_HMAC_SECRET in env");
  }
  return secret;
}

function sign(videoUuid: string, timestamp: string): string {
  const data = `${videoUuid}:${timestamp}`;
  return crypto.createHmac("sha256", getCallbackSecret()).update(data).digest("hex");
}

function buildSignedUrl(baseUrl: string, videoUuid: string, timestamp: string, signature: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("videoUuid", videoUuid);
  url.searchParams.set("ts", timestamp);
  url.searchParams.set("sig", signature);
  return url.toString();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const baseURL = await resolveBaseURL();

  const { db, videos, webhookEvents, VideoStatus } = await import("../src/db");

  const provider = "evolink";
  const callbackBase = `${baseURL}/api/v1/video/callback/${provider}`;
  const invalidProviderBase = `${baseURL}/api/v1/video/callback/unknown`;

  // Provider validation
  {
    const { status, json } = await fetchJson<{ received: boolean }>(invalidProviderBase, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(status === 400, `Expected invalid provider to return 400 but got ${status}`);
    assert(json.success === false, "Expected error response for invalid provider");
    console.log("P0-10 ok: invalid provider rejected");
  }

  const videoUuid = crypto.randomUUID();
  const taskId = `task_${crypto.randomUUID()}`;
  const eventSource = `ai_callback_${provider}`;

  // Clean up any leftovers (safe even if absent).
  await db.delete(webhookEvents).where(and(eq(webhookEvents.source, eventSource), eq(webhookEvents.eventId, taskId)));
  await db.delete(videos).where(eq(videos.uuid, videoUuid));

  // Insert a minimal video row so callback can match externalTaskId without trying to settle credits.
  await db.insert(videos).values({
    uuid: videoUuid,
    userId: "callback_smoke_user",
    prompt: "callback smoke test",
    model: "sora-2",
    status: VideoStatus.GENERATING,
    provider,
    externalTaskId: taskId,
    creditsUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  });

  // Missing signature params -> 400
  {
    const { status, json } = await fetchJson<{ received: boolean }>(callbackBase, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: taskId, status: "processing" }),
    });
    assert(status === 400, `Expected missing signature params to return 400 but got ${status}`);
    assert(json.success === false, "Expected error response for missing signature params");
    console.log("P0-10 ok: missing signature params rejected");
  }

  // Invalid signature -> 401
  {
    const ts = Date.now().toString();
    const goodSig = sign(videoUuid, ts);
    const badSig = `${goodSig.slice(0, -1)}${goodSig.slice(-1) === "a" ? "b" : "a"}`;
    const url = buildSignedUrl(callbackBase, videoUuid, ts, badSig);

    const { status, json } = await fetchJson<{ received: boolean }>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: taskId, status: "processing" }),
    });
    assert(status === 401, `Expected invalid signature to return 401 but got ${status}`);
    assert(json.success === false, "Expected error response for invalid signature");
    console.log("P0-10 ok: invalid signature rejected");
  }

  // Expired signature -> 401
  {
    const tsExpired = (Date.now() - 25 * 60 * 60 * 1000).toString();
    const sigExpired = sign(videoUuid, tsExpired);
    const url = buildSignedUrl(callbackBase, videoUuid, tsExpired, sigExpired);

    const { status, json } = await fetchJson<{ received: boolean }>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: taskId, status: "processing" }),
    });
    assert(status === 401, `Expected expired signature to return 401 but got ${status}`);
    assert(json.success === false, "Expected error response for expired signature");
    console.log("P0-10 ok: expired signature rejected");
  }

  // Valid signature + idempotency (webhook_events de-dupe)
  {
    const ts = Date.now().toString();
    const sig = sign(videoUuid, ts);
    const url = buildSignedUrl(callbackBase, videoUuid, ts, sig);

    const payload = { id: taskId, status: "processing", results: [] };

    const first = await fetchJson<{ received: boolean }>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert(first.status === 200, `Expected callback to return 200 but got ${first.status}`);
    assert(first.json.success === true, "Expected success response for valid callback");

    const rows1 = await db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.source, eventSource), eq(webhookEvents.eventId, taskId)));
    assert(rows1.length === 1, `Expected webhook_events to have 1 row but got ${rows1.length}`);

    const second = await fetchJson<{ received: boolean }>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert(second.status === 200, `Expected duplicate callback to return 200 but got ${second.status}`);
    assert(second.json.success === true, "Expected success response for duplicate callback");

    const rows2 = await db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.source, eventSource), eq(webhookEvents.eventId, taskId)));
    assert(rows2.length === 1, `Expected webhook_events to remain 1 row but got ${rows2.length}`);

    console.log("P0-10 ok: valid callback + idempotency");
  }

  // Cleanup
  await db.delete(webhookEvents).where(and(eq(webhookEvents.source, eventSource), eq(webhookEvents.eventId, taskId)));
  await db.delete(videos).where(eq(videos.uuid, videoUuid));

  console.log("P0-10 callback smoke all ok");
  // Drizzle/postgres keeps a pool open; exit explicitly for CLI smoke scripts.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
