"use client";

export type DevBypassUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

export const isDevBypassEnabled = () =>
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export async function fetchDevBypassUser(): Promise<DevBypassUser | null> {
  if (!isDevBypassEnabled()) return null;

  try {
    const res = await fetch("/api/v1/user/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  } catch {
    return null;
  }
}
