-- Migration: NextAuth to Better Auth
-- This migration creates Better Auth tables and migrates existing user data

-- =============================================
-- Step 1: Create Better Auth Tables
-- =============================================

-- Create user table (Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "isAdmin" BOOLEAN NOT NULL DEFAULT false
);

-- Create session table (Better Auth)
CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create account table (Better Auth)
CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  "scope" TEXT,
  "idToken" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("providerId", "accountId")
);

-- Create verification table (Better Auth)
CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");

-- =============================================
-- Step 2: Migrate Data from NextAuth Tables
-- =============================================

-- Migrate users from "User" to "user"
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "isAdmin")
SELECT
  "id",
  "name",
  "email",
  COALESCE("emailVerified" IS NOT NULL, false),
  "image",
  now(),
  now(),
  false
FROM "User"
WHERE "email" IS NOT NULL
ON CONFLICT ("email") DO NOTHING;

-- Migrate accounts from "Account" to "account"
INSERT INTO "account" ("id", "userId", "accountId", "providerId", "accessToken", "refreshToken", "scope", "idToken", "createdAt", "updatedAt")
SELECT
  "id",
  "userId",
  "providerAccountId",
  "provider",
  "access_token",
  "refresh_token",
  "scope",
  "id_token",
  now(),
  now()
FROM "Account"
WHERE EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "Account"."userId")
ON CONFLICT ("providerId", "accountId") DO NOTHING;

-- =============================================
-- Step 3: Optional - Drop Legacy Tables
-- Run these commands AFTER verifying the migration
-- =============================================

-- WARNING: Only run these after confirming migration is successful!
-- DROP TABLE IF EXISTS "Account" CASCADE;
-- DROP TABLE IF EXISTS "Session" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;
-- DROP TABLE IF EXISTS "VerificationToken" CASCADE;
