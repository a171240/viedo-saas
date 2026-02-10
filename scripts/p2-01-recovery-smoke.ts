import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

function uniq(items: Array<string | undefined | null>) {
  return [...new Set(items.filter(Boolean))] as string[];
}

function isRetryableError(error: unknown) {
  const msg = String((error as { message?: string })?.message ?? error);
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("socket hang up") ||
    msg.includes("UND_ERR_CONNECT_TIMEOUT") ||
    msg.includes("UND_ERR_SOCKET")
  );
}

async function fetchWithRetries(url: string, init: RequestInit, attempts = 6) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const resp = await fetch(url, init);
      // When Next dev restarts, we can transiently see 502/503.
      if ([502, 503, 504].includes(resp.status) && attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 + attempt * 600));
        continue;
      }
      return resp;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && isRetryableError(error)) {
        await new Promise((r) => setTimeout(r, 800 + attempt * 600));
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error(`Failed to fetch: ${url}`);
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

function getAdminSecret(): string {
  const secret = process.env.AI_CALLBACK_SECRET ?? process.env.CALLBACK_HMAC_SECRET;
  if (!secret) {
    throw new Error("Missing AI_CALLBACK_SECRET/CALLBACK_HMAC_SECRET in env");
  }
  return secret;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const baseURL = await resolveBaseURL();
  const secret = getAdminSecret();

  const endpoint = `${baseURL}/api/v1/video/recover`;

  // Unauthorized
  {
    const resp = await fetchWithRetries(`${endpoint}?secret=wrong_secret`, { redirect: "manual" });
    assert(resp.status === 401, `Expected unauthorized recover to return 401 but got ${resp.status}`);
    console.log("P2-01 ok: unauthorized blocked");
  }

  // Authorized (dry-run)
  {
    const resp = await fetchWithRetries(
      `${endpoint}?secret=${encodeURIComponent(secret)}&limit=1`,
      { redirect: "manual" }
    );
    assert(resp.status === 200, `Expected authorized recover to return 200 but got ${resp.status}`);
    const json = (await resp.json()) as { success?: boolean; dryRun?: boolean };
    assert(json.success === true, "Expected success=true for authorized recover");
    assert(json.dryRun === true, "Expected dryRun=true by default");
    console.log("P2-01 ok: authorized dry-run works");
  }

  console.log("P2-01 recovery smoke all ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
