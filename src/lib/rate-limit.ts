import type { NextRequest } from "next/server";

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

type Bucket = {
  count: number;
  reset: number;
};

const buckets = new Map<string, Bucket>();

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return request.ip ?? "unknown";
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.reset <= now) {
    const reset = now + options.windowMs;
    buckets.set(key, { count: 1, reset });
    return {
      allowed: true,
      remaining: options.max - 1,
      reset,
      retryAfter: Math.ceil(options.windowMs / 1000),
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, options.max - bucket.count);
  const allowed = bucket.count <= options.max;
  const retryAfter = Math.max(0, Math.ceil((bucket.reset - now) / 1000));

  if (!allowed) {
    return {
      allowed: false,
      remaining,
      reset: bucket.reset,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining,
    reset: bucket.reset,
    retryAfter,
  };
}
