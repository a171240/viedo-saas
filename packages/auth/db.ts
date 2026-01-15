// Re-export database instance and types from @videofly/db
// Better Auth uses lowercase table names: user, session, account, verification
export { db } from "@videofly/db";
export type {
  DB,
  BetterAuthUser,
  BetterAuthSession,
  BetterAuthAccount,
  BetterAuthVerification,
} from "@videofly/db";
