import { eq } from "drizzle-orm";

import { db, users } from "@/db";

const DEFAULT_DEV_EMAIL = "dev@example.com";

export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_AUTH === "true"
  );
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
    .returning();

  return created ?? null;
}
