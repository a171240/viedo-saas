import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { db, rateLimitBuckets } = await import("../src/db");
  const { rateLimit } = await import("../src/lib/rate-limit");

  const key = `smoke_rate_limit:${crypto.randomUUID()}`;
  const options = { windowMs: 30_000, max: 3 };

  const r1 = await rateLimit(key, options);
  assert(r1.allowed, "Expected request 1 to be allowed");

  const r2 = await rateLimit(key, options);
  assert(r2.allowed, "Expected request 2 to be allowed");

  const r3 = await rateLimit(key, options);
  assert(r3.allowed, "Expected request 3 to be allowed");

  const r4 = await rateLimit(key, options);
  assert(!r4.allowed, "Expected request 4 to be blocked");

  await db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, key));

  console.log("P2-05 rate limit smoke ok");
  // Drizzle/postgres keeps a pool open; exit explicitly for CLI smoke scripts.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

