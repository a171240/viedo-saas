import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db, videos } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShareRemixButton from "@/components/share/share-remix-button";

type SharePageProps = {
  params: Promise<{ locale: string; uuid: string }>;
};

type VideoParameters = {
  mode?: string;
  duration?: number;
  aspectRatio?: string;
  quality?: string;
  outputNumber?: number;
  imageUrl?: string;
  imageUrls?: string[];
  generateAudio?: boolean;
};

const resolveToolRoute = (mode?: string, hasImage?: boolean) => {
  if (mode === "product-to-video") return "product-to-video";
  if (mode === "reference-to-video") return "reference-to-video";
  if (mode === "image-to-video") return "image-to-video";
  if (mode === "text-to-video") return "text-to-video";
  return hasImage ? "image-to-video" : "text-to-video";
};

export default async function SharePage({ params }: SharePageProps) {
  const { locale, uuid } = await params;
  const t = await getTranslations("Share");

  const [video] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.uuid, uuid), eq(videos.isDeleted, false)))
    .limit(1);

  if (!video) {
    notFound();
  }

  const parameters = (video.parameters ?? {}) as VideoParameters;
  const hasImage = Boolean(parameters.imageUrl || (parameters.imageUrls && parameters.imageUrls.length > 0) || video.startImageUrl);
  const toolRoute = resolveToolRoute(parameters.mode, hasImage);
  const statusKey = String(video.status || "unknown").toLowerCase();
  const statusLabel = t(`status.${statusKey}`, { default: video.status || "Unknown" });

  const prefill = {
    prompt: video.prompt,
    model: video.model,
    mode: parameters.mode,
    duration: video.duration ?? parameters.duration ?? undefined,
    aspectRatio: video.aspectRatio ?? parameters.aspectRatio ?? undefined,
    quality: video.resolution ?? parameters.quality ?? undefined,
    imageUrl: video.startImageUrl ?? parameters.imageUrl ?? parameters.imageUrls?.[0],
  };

  const parameterEntries: Array<[string, string | number | boolean]> = [];
  if (parameters.mode) parameterEntries.push([t("fields.mode"), parameters.mode]);
  if (prefill.duration) parameterEntries.push([t("fields.duration"), `${prefill.duration}s`]);
  if (prefill.aspectRatio) parameterEntries.push([t("fields.aspectRatio"), prefill.aspectRatio]);
  if (prefill.quality) parameterEntries.push([t("fields.quality"), prefill.quality]);
  if (parameters.outputNumber) parameterEntries.push([t("fields.outputNumber"), parameters.outputNumber]);
  if (parameters.generateAudio !== undefined) {
    parameterEntries.push([t("fields.generateAudio"), parameters.generateAudio ? t("common.yes") : t("common.no")]);
  }

  return (
    <div className="container mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{statusLabel}</Badge>
          <ShareRemixButton locale={locale} toolRoute={toolRoute} prefill={prefill} />
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {video.videoUrl ? (
            <video
              className="w-full rounded-xl border border-border"
              controls
              src={video.videoUrl}
              poster={video.thumbnailUrl ?? undefined}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {t("emptyVideo")}
            </div>
          )}
          {video.startImageUrl && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("fields.referenceImage")}</span>
              <a className="text-primary hover:underline" href={video.startImageUrl}>
                {t("viewImage")}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="p-6 space-y-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {t("sections.prompt")}
              </summary>
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                {video.prompt}
              </div>
            </details>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {t("sections.parameters")}
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {parameterEntries.length === 0 ? (
                  <div>{t("emptyParameters")}</div>
                ) : (
                  parameterEntries.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span>{label}</span>
                      <span className="text-foreground">{String(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium">{t("sections.summary")}</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>{t("fields.model")}</span>
                <span className="text-foreground">{video.model}</span>
              </div>
              {video.aspectRatio && (
                <div className="flex items-center justify-between gap-3">
                  <span>{t("fields.aspectRatio")}</span>
                  <span className="text-foreground">{video.aspectRatio}</span>
                </div>
              )}
              {video.duration && (
                <div className="flex items-center justify-between gap-3">
                  <span>{t("fields.duration")}</span>
                  <span className="text-foreground">{video.duration}s</span>
                </div>
              )}
              {video.resolution && (
                <div className="flex items-center justify-between gap-3">
                  <span>{t("fields.quality")}</span>
                  <span className="text-foreground">{video.resolution}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span>{t("fields.createdAt")}</span>
                <span className="text-foreground">
                  {new Date(video.createdAt).toLocaleString(locale)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
