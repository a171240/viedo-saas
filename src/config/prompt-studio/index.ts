import type { Locale, PromptTemplate } from "./types";
import { PROMPT_TEMPLATES_EN } from "./templates.en";
import { PROMPT_TEMPLATES_ZH } from "./templates.zh";

export * from "./types";

export const PROMPT_TEMPLATES: Record<Locale, PromptTemplate[]> = {
  en: PROMPT_TEMPLATES_EN,
  zh: PROMPT_TEMPLATES_ZH,
};

export function getPromptStudioTemplates(locale: Locale): PromptTemplate[] {
  return PROMPT_TEMPLATES[locale] ?? PROMPT_TEMPLATES_EN;
}

export function getPromptStudioTemplate(locale: Locale, id?: string): PromptTemplate | undefined {
  if (!id) return getPromptStudioTemplates(locale)[0];
  return getPromptStudioTemplates(locale).find((template) => template.id === id);
}
