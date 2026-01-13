// Re-export database instance and types from @saasfly/db
// Better Auth uses lowercase table names: user, session, account, verification
export { db } from "@saasfly/db";
export type {
  DB,
  BetterAuthUser,
  BetterAuthSession,
  BetterAuthAccount,
  BetterAuthVerification,
} from "@saasfly/db";
