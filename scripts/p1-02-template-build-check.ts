import { getPromptStudioTemplates } from "../src/config/prompt-studio";
import type { Locale, PromptStudioInput, PromptStudioOutput, PromptTemplate } from "../src/config/prompt-studio";

function buildSampleInput(locale: Locale, template: PromptTemplate): PromptStudioInput {
  const sample: Record<string, string | string[]> = {};

  for (const field of template.fields) {
    if (!field.required) continue;

    const key = field.key.toLowerCase();

    if (field.type === "tags") {
      sample[field.key] =
        locale === "zh"
          ? ["补水", "提亮", "舒缓"]
          : ["Hydration", "Brightening", "Soothing"];
      continue;
    }

    if (field.type === "select") {
      const option = field.options?.[0] ?? (locale === "zh" ? "默认" : "Default");
      sample[field.key] = option;
      continue;
    }

    // Prefer stable samples based on common field names used by templates.
    if (key.includes("product")) sample[field.key] = locale === "zh" ? "焕亮精华" : "Glow Serum";
    else if (key.includes("audience")) sample[field.key] = locale === "zh" ? "护肤新手" : "Skincare beginners";
    else if (key.includes("benefit")) sample[field.key] = locale === "zh" ? "补水、提亮、舒缓" : "Hydration, Brightening, Soothing";
    else if (key.includes("cta")) sample[field.key] = locale === "zh" ? "立即购买" : "Shop now";
    else if (key.includes("brand")) sample[field.key] = locale === "zh" ? "VideoFly" : "VideoFly";
    else sample[field.key] = locale === "zh" ? "示例" : "Example";
  }

  return sample;
}

function assertOutput(locale: Locale, template: PromptTemplate, output: PromptStudioOutput) {
  const errors: string[] = [];

  if (!output.positioningLine?.trim()) errors.push("positioningLine empty");
  if (!Array.isArray(output.angles) || output.angles.length < 8) errors.push("angles too small");

  const stages = new Set(output.calendar4x4?.map((b) => b.stage));
  for (const stage of ["Acquire", "Trust", "Convert", "Retain"] as const) {
    if (!stages.has(stage)) errors.push(`calendar missing stage: ${stage}`);
  }
  if (output.calendar4x4?.some((b) => !Array.isArray(b.angles) || b.angles.length < 2)) {
    errors.push("calendar stage angles too small");
  }

  if (!output.script?.hook?.trim()) errors.push("script.hook empty");
  if (!Array.isArray(output.script?.valuePoints) || output.script.valuePoints.length < 2) {
    errors.push("script.valuePoints too small");
  }
  if (!output.script?.proof?.trim()) errors.push("script.proof empty");
  if (!output.script?.cta?.trim()) errors.push("script.cta empty");
  if (!Array.isArray(output.script?.onScreenText) || output.script.onScreenText.length < 2) {
    errors.push("script.onScreenText too small");
  }
  if (!Array.isArray(output.script?.shotList) || output.script.shotList.length < 3) {
    errors.push("script.shotList too small");
  }

  if (!output.videoPrompt?.trim()) errors.push("videoPrompt empty");
  if (!output.metadata?.ratio) errors.push("metadata.ratio missing");
  if (!Number.isFinite(output.metadata?.durationSeconds) || output.metadata.durationSeconds <= 0) {
    errors.push("metadata.durationSeconds invalid");
  }

  if (errors.length) {
    throw new Error(`[PromptStudio build] ${locale}/${template.id}: ${errors.join(", ")}`);
  }
}

async function main() {
  const locales: Locale[] = ["en", "zh"];

  for (const locale of locales) {
    const templates = getPromptStudioTemplates(locale);
    if (!templates.length) {
      throw new Error(`No templates for locale=${locale}`);
    }

    for (const template of templates) {
      const input = buildSampleInput(locale, template);
      let output: PromptStudioOutput;
      try {
        output = template.build(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[PromptStudio build] ${locale}/${template.id} threw: ${message}`);
      }
      assertOutput(locale, template, output);
    }
  }

  console.log("P1-02 template build ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
