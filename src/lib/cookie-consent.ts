export const COOKIE_CONSENT_KEY = "vf_cookie_consent";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed?.analytics !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(analytics: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: CookieConsent = {
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("cookie-consent-change"));
}
