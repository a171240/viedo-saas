"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/components/ui";
import {
  getPromptStudioTemplates,
  type Locale,
  type PromptStudioInput,
  type PromptStudioOutput,
  type PromptTemplate,
} from "@/config/prompt-studio";

type PromptStudioDialogProps = {
  locale: Locale;
  trigger?: React.ReactNode;
  defaultTemplateId?: string;
  onApplyPrompt?: (prompt: string, output: PromptStudioOutput) => void;
  onBatchCreate?: (prompts: string[], output: PromptStudioOutput) => void | Promise<void>;
  batchOptions?: number[];
  batchDisabled?: boolean;
  batchDisabledHint?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type StepKey = "positioning" | "angleMining" | "calendar" | "scriptPrompt";

const STEP_KEYS: StepKey[] = ["positioning", "angleMining", "calendar", "scriptPrompt"];

export function PromptStudioDialog({
  locale,
  trigger,
  defaultTemplateId,
  onApplyPrompt,
  onBatchCreate,
  batchOptions,
  batchDisabled = false,
  batchDisabledHint,
  open: controlledOpen,
  onOpenChange,
}: PromptStudioDialogProps) {
  const t = useTranslations("PromptStudio");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const templates = useMemo(() => getPromptStudioTemplates(locale), [locale]);
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? "");
  const [activeStep, setActiveStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const resolvedBatchOptions = useMemo(() => (batchOptions?.length ? batchOptions : [3, 5, 10]), [batchOptions]);
  const [batchCount, setBatchCount] = useState(resolvedBatchOptions[0] ?? 3);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);

  useEffect(() => {
    const nextId = defaultTemplateId ?? templates[0]?.id ?? "";
    setTemplateId((prev) => (templates.some((t) => t.id === prev) ? prev : nextId));
  }, [templates, defaultTemplateId]);

  const template = useMemo<PromptTemplate | undefined>(
    () => templates.find((t) => t.id === templateId) ?? templates[0],
    [templates, templateId],
  );

  useEffect(() => {
    setFormValues({});
    setActiveStep(0);
    setSelectedAngles([]);
  }, [template?.id]);

  const normalizedInput = useMemo<PromptStudioInput>(() => {
    const input: PromptStudioInput = {};
    if (!template) return input;
    for (const field of template.fields) {
      const raw = formValues[field.key] ?? "";
      if (field.type === "tags") {
        input[field.key] = raw
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        input[field.key] = raw.trim();
      }
    }
    return input;
  }, [formValues, template]);

  const isReady = useMemo(() => {
    if (!template) return false;
    return template.fields.every((field) => {
      if (!field.required) return true;
      const value = normalizedInput[field.key];
      if (field.type === "tags") return Array.isArray(value) && value.length > 0;
      return typeof value === "string" && value.trim().length > 0;
    });
  }, [template, normalizedInput]);

  const output = useMemo<PromptStudioOutput | null>(() => {
    if (!template || !isReady) return null;
    return template.build(normalizedInput);
  }, [template, isReady, normalizedInput]);

  useEffect(() => {
    setSelectedAngles((prev) => prev.slice(0, batchCount));
  }, [batchCount]);

  const steps = useMemo(
    () =>
      STEP_KEYS.map((key) => ({
        key,
        label: t(`steps.${key}`),
      })),
    [t],
  );

  const handleApply = () => {
    if (!output?.videoPrompt) return;
    onApplyPrompt?.(output.videoPrompt, output);
    setOpen(false);
  };

  const buildAnglePrompt = (angle: string) => {
    if (!output) return "";
    const ratio = output.metadata?.ratio ?? "9:16";
    const lines = [
      `Create a short video in ${ratio}.`,
      `Angle: ${angle}.`,
      `Hook: ${angle}.`,
      `Value points: ${output.script.valuePoints.join(", ")}.`,
      `Proof: ${output.script.proof}.`,
      `CTA: ${output.script.cta}.`,
      "Storyboard:",
      ...output.script.shotList.map((shot) => `- ${shot}`),
      "No subtitles or text rendered inside the video.",
    ];
    return lines.join("\n");
  };

  const handleQueue = async () => {
    if (!output || !onBatchCreate || batchDisabled) return;
    const prompts = selectedAngles
      .slice(0, batchCount)
      .map((angle) => buildAnglePrompt(angle))
      .filter(Boolean);
    if (!prompts.length) return;
    await onBatchCreate(prompts, output);
    setOpen(false);
  };

  const renderField = (field: PromptTemplate["fields"][number]) => {
    const value = formValues[field.key] ?? "";
    const requiredMark = field.required ? " *" : "";

    if (field.type === "textarea") {
      return (
        <div key={field.key} className="space-y-2">
          <Label>
            {field.label}
            {requiredMark}
          </Label>
          <Textarea
            value={value}
            rows={3}
            placeholder={field.placeholder}
            onChange={(event) => setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
          />
        </div>
      );
    }

    if (field.type === "tags") {
      return (
        <div key={field.key} className="space-y-2">
          <Label>
            {field.label}
            {requiredMark}
          </Label>
          <Textarea
            value={value}
            rows={2}
            placeholder={field.placeholder ?? t("hints.tagHint")}
            onChange={(event) => setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
          />
          <p className="text-xs text-muted-foreground">{t("hints.tagHint")}</p>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key} className="space-y-2">
          <Label>
            {field.label}
            {requiredMark}
          </Label>
          <Select
            value={value}
            onValueChange={(next) => setFormValues((prev) => ({ ...prev, [field.key]: next }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label>
          {field.label}
          {requiredMark}
        </Label>
        <Input
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
        />
      </div>
    );
  };

  const renderStepContent = () => {
    if (!template) return null;
    if (!output) {
      return <p className="text-sm text-muted-foreground">{t("hints.fillRequired")}</p>;
    }

    const stageLabels: Record<string, string> = {
      Acquire: t("stages.Acquire"),
      Trust: t("stages.Trust"),
      Convert: t("stages.Convert"),
      Retain: t("stages.Retain"),
    };

    switch (STEP_KEYS[activeStep]) {
      case "positioning":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="text-xs uppercase text-muted-foreground">{t("sections.positioningLine")}</div>
              <p className="mt-2 text-sm font-medium">{output.positioningLine}</p>
            </div>
          </div>
        );
      case "angleMining":
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">{t("sections.angles")}</div>
            <div className="flex flex-wrap gap-2">
              {output.angles.map((angle) => (
                <span key={angle} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  {angle}
                </span>
              ))}
            </div>
          </div>
        );
      case "calendar":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {output.calendar4x4.map((block) => (
                <div key={block.stage} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="text-sm font-semibold">{stageLabels[block.stage]}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {block.angles.map((angle) => {
                      const selected = selectedAngles.includes(angle);
                      return (
                        <button
                          type="button"
                          key={angle}
                          onClick={() =>
                            setSelectedAngles((prev) => {
                              if (prev.includes(angle)) {
                                return prev.filter((item) => item !== angle);
                              }
                              if (prev.length >= batchCount) {
                                return prev;
                              }
                              return [...prev, angle];
                            })
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {angle}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {onBatchCreate && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{t("batch.title")}</div>
                    <p className="text-xs text-muted-foreground">{t("batch.subtitle", { count: batchCount })}</p>
                  </div>
                  <Select value={batchCount.toString()} onValueChange={(value) => setBatchCount(Number(value))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedBatchOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {t("batch.countOption", { count: option })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{t("batch.selectedCount", { count: selectedAngles.length, max: batchCount })}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAngles(output.angles.slice(0, batchCount))}
                    >
                      {t("batch.actions.selectTop", { count: batchCount })}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAngles([])}>
                      {t("batch.actions.clear")}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {batchDisabled && batchDisabledHint && (
                    <p className="text-xs text-muted-foreground">{batchDisabledHint}</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQueue}
                    disabled={batchDisabled || selectedAngles.length === 0}
                  >
                    {t("batch.actions.queue", { count: selectedAngles.length })}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      case "scriptPrompt":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-xs uppercase text-muted-foreground">{t("sections.script")}</div>
                <div className="text-sm font-medium">{output.script.hook}</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {output.script.valuePoints.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground">{output.script.proof}</div>
                <div className="text-sm font-medium">{output.script.cta}</div>
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-xs uppercase text-muted-foreground">{t("sections.onScreenText")}</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {output.script.onScreenText.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <div className="pt-2 text-xs uppercase text-muted-foreground">{t("sections.shotList")}</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {output.script.shotList.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("sections.videoPrompt")}</div>
              <Textarea readOnly value={output.videoPrompt} rows={6} className="text-xs" />
            </div>
            {output.negativePrompt && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("sections.negativePrompt")}</div>
                <Textarea readOnly value={output.negativePrompt} rows={2} className="text-xs" />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isDone = index < activeStep;
              return (
                <button
                  type="button"
                  key={step.key}
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : isDone
                        ? "border-primary/40 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
            <div className="space-y-2">
              <Label>{t("templateLabel")}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("templateLabel")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template?.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">{template?.fields.map((field) => renderField(field))}</div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-5">{renderStepContent()}</div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
            disabled={activeStep === 0}
          >
            {t("actions.back")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveStep((prev) => Math.min(prev + 1, steps.length - 1))}
            disabled={activeStep === steps.length - 1}
          >
            {t("actions.next")}
          </Button>
          <Button onClick={handleApply} disabled={!output?.videoPrompt}>
            {t("actions.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromptStudioDialog;
