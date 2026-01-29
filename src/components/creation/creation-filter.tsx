"use client";

// ============================================
// Creation Filter Component
// ============================================

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VideoFilterOptions, VideoStatus } from "@/lib/types/dashboard";

interface CreationFilterProps {
  filter: VideoFilterOptions;
  onFilterChange: (filter: Partial<VideoFilterOptions>) => void;
}

const availableModels = ["all", "sora-2", "veo-3-1", "seedance-1-5", "wan-2-6"] as const;

const statusOptions = ["all", "completed", "generating", "failed"] as const;

const sortOptions = ["newest", "oldest"] as const;

export function CreationFilter({ filter, onFilterChange }: CreationFilterProps) {
  const t = useTranslations("dashboard.myCreations.filter");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Filter */}
      <Select
        value={filter.status || "all"}
        onValueChange={(value) => onFilterChange({ status: value as VideoStatus | "all" })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("allStatus")} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((value) => (
            <SelectItem key={value} value={value}>
              {t(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Model Filter */}
      <Select
        value={filter.model || "all"}
        onValueChange={(value) => onFilterChange({ model: value as string | "all" })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("allModels")} />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model} value={model}>
              {t(`models.${model}` as any)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Order */}
      <Select
        value={filter.sortBy || "newest"}
        onValueChange={(value) => onFilterChange({ sortBy: value as "newest" | "oldest" })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder={t("newest")} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((value) => (
            <SelectItem key={value} value={value}>
              {t(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
