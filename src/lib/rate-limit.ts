import type { NextRequest } from "next/server";
import { lt, sql } from "drizzle-orm";

import { db, rateLimitBuckets } from "@/db";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
  retryAfter: number;
};

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const CLEANUP_OLDER_THAN_MS = 24 * 60 * 60 * 1000; // 24h

let lastCleanupAtMs = 0;

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const directIp = (request as { ip?: string }).ip;
  return directIp ?? "unknown";
}

async function maybeCleanup(nowMs: number) {
  if (nowMs - lastCleanupAtMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupAtMs = nowMs;

  try {
    const cutoff = new Date(nowMs - CLEANUP_OLDER_THAN_MS);
    await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.resetAt, cutoff));
  } catch {
    // Cleanup is best-effort; don't block user requests on DB maintenance.
  }
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const nextResetAt = new Date(nowMs + options.windowMs);
  const nextResetAtIso = nextResetAt.toISOString();

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({
      bucketKey: key,
      count: 1,
      resetAt: nextResetAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.bucketKey,
      set: {
        count: sql`CASE WHEN ${rateLimitBuckets.resetAt} <= NOW() THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimitBuckets.resetAt} <= NOW() THEN ${nextResetAtIso}::timestamp ELSE ${rateLimitBuckets.resetAt} END`,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt });

  const count = Number(row?.count ?? 0);
  const resetMs = row?.resetAt ? new Date(row.resetAt).getTime() : nowMs + options.windowMs;

  const remaining = Math.max(0, options.max - count);
  const allowed = count <= options.max;
  const retryAfter = Math.max(0, Math.ceil((resetMs - nowMs) / 1000));

  await maybeCleanup(nowMs);

  return {
    allowed,
    remaining,
    reset: resetMs,
    retryAfter,
  };
}
