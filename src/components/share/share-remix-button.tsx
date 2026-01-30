"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const TOOL_PREFILL_KEY = "videofly_tool_prefill";

type RemixPrefill = {
  prompt?: string;
  model?: string;
  mode?: string;
  duration?: number;
  aspectRatio?: string;
  quality?: string;
  imageUrl?: string;
};

type ShareRemixButtonProps = {
  locale: string;
  toolRoute: string;
  prefill: RemixPrefill;
};

export function ShareRemixButton({ locale, toolRoute, prefill }: ShareRemixButtonProps) {
  const router = useRouter();
  const t = useTranslations("Share");

  const handleRemix = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(TOOL_PREFILL_KEY, JSON.stringify(prefill));
      }
    } catch (error) {
      console.warn("Failed to store remix data:", error);
    }
    router.push(`/${locale}/${toolRoute}`);
  };

  return (
    <Button type="button" onClick={handleRemix}>
      {t("actions.remix")}
    </Button>
  );
}

export default ShareRemixButton;
