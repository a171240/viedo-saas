"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { readCookieConsent } from "@/lib/cookie-consent";

export function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = () => {
      const consent = readCookieConsent();
      setEnabled(Boolean(consent?.analytics));
    };

    update();
    window.addEventListener("cookie-consent-change", update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("cookie-consent-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
