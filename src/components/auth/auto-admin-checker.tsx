"use client";

import { useAutoSetAdmin } from "@/hooks/use-auto-set-admin";

/**
 * Client component that automatically checks and sets admin permissions
 * based on ADMIN_EMAIL environment variable.
 *
 * This should be included in authenticated layouts/pages to automatically
 * grant admin permissions when the user's email matches ADMIN_EMAIL.
 */
export function AutoAdminChecker() {
  useAutoSetAdmin();
  return null;
}
