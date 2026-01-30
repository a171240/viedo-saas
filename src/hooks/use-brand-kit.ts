import { useCallback, useEffect, useState } from "react";
import {
  BRAND_KIT_DEFAULTS,
  BRAND_KIT_STORAGE_KEY,
  normalizeBrandKit,
  type BrandKit,
} from "@/config/brand-kit";

export const useBrandKit = () => {
  const [brandKit, setBrandKit] = useState<BrandKit>(BRAND_KIT_DEFAULTS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BRAND_KIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BrandKit>;
        setBrandKit(normalizeBrandKit(parsed));
      }
    } catch (error) {
      console.warn("Failed to load brand kit settings", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const persist = useCallback((next: BrandKit) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateBrandKit = useCallback(
    (patch: Partial<BrandKit>) => {
      setBrandKit((prev) => {
        const next = normalizeBrandKit({ ...prev, ...patch });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replaceBrandKit = useCallback(
    (next: BrandKit) => {
      const normalized = normalizeBrandKit(next);
      setBrandKit(normalized);
      persist(normalized);
    },
    [persist],
  );

  return {
    brandKit,
    updateBrandKit,
    replaceBrandKit,
    isReady,
  };
};
