-- Migration: Creem subscription persistence (Better Auth plugin)

CREATE TABLE IF NOT EXISTS "creem_subscriptions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "product_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "current_period_end" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "creem_subscriptions_user_id_idx"
  ON "creem_subscriptions"("user_id");
