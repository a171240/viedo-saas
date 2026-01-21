"use client";

// ============================================
// Balance Card Component
// ============================================

import { useTranslations } from "next-intl";
import { Gem, Snowflake, Skull } from "lucide-react";
import { cn } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import type { CreditBalance } from "@/lib/types/dashboard";

interface BalanceCardProps {
  balance: CreditBalance | null;
  onBuyCredits: () => void;
}

export function BalanceCard({ balance, onBuyCredits }: BalanceCardProps) {
  const t = useTranslations("dashboard.credits");

  if (!balance) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">Loading balance...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-6 space-y-6">
        {/* Main balance */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">{t("available")}</div>
          <div className="text-5xl font-bold tracking-tight">
            {balance.availableCredits.toLocaleString()}
          </div>
        </div>

        {/* Sub balances */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Snowflake className="h-4 w-4 text-blue-500" />
            <span>{balance.frozenCredits}</span>
            <span>{t("frozen")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Skull className="h-4 w-4 text-rose-500" />
            <span>{balance.usedCredits}</span>
            <span>{t("used")}</span>
          </div>
        </div>

        {/* Buy credits button */}
        <button
          onClick={onBuyCredits}
          className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Gem className="h-5 w-5" />
          {t("buyCredits")}
        </button>
      </CardContent>
    </Card>
  );
}
