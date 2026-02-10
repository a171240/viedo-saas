import { eq } from "drizzle-orm";

import { db, users } from "@/db";

const DEFAULT_DEV_EMAIL = "dev@example.com";

export function isDevBypassEnabled(): boolean {
  if (process.env.DEV_BYPASS_AUTH !== "true") return false;

  // Default: never allow bypass in production runtime (e.g. Vercel).
  // Exception: CI can explicitly opt-in so regression runs can use `next start`.
  const allowProdBypass =
    process.env.NODE_ENV === "production" &&
    process.env.CI === "true" &&
    process.env.DEV_BYPASS_AUTH_ALLOW_PROD === "true" &&
    process.env.VERCEL !== "1";

  return process.env.NODE_ENV !== "production" || allowProdBypass;
}

export async function getDevBypassUser() {
  if (!isDevBypassEnabled()) return null;

  const email =
    process.env.DEV_BYPASS_USER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    DEFAULT_DEV_EMAIL;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: "Dev User",
      emailVerified: true,
    })
    // Next.js can prerender multiple pages concurrently in CI, which can race on dev user creation.
    // Make the insert idempotent and fall back to selecting the existing user.
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (created) return created;

  const [afterConflict] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return afterConflict ?? null;
}
