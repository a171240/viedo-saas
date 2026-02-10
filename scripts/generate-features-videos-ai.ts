#!/usr/bin/env tsx
/**
 * Generate landing "Features" preview videos via the real AI video API (Evolink).
 *
 * Output:
 * - public/videos/features/{text-to-video,image-to-video,enhancement}.mp4
 * - public/images/features/{text-to-video,image-to-video,enhancement}.jpg
 *
 * Notes:
 * - Uses EVOLINK_API_KEY from env.
 * - Keeps assets small and consistent by transcoding to 960x540, 30fps, 4s, H.264, no audio.
 */

import { spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import ffmpegPath from "ffmpeg-static";
import { EvolinkProvider } from "../src/ai/providers/evolink";

type FeatureSpec = {
  name: "text-to-video" | "image-to-video" | "enhancement";
  prompt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const videoDir = path.join(repoRoot, "public", "videos", "features");
const imageDir = path.join(repoRoot, "public", "images", "features");
const tmpDir = path.join(repoRoot, "tmp", "features-ai");

mkdirSync(videoDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const outVideo = (name: FeatureSpec["name"]) => path.join(videoDir, `${name}.mp4`);
const outPoster = (name: FeatureSpec["name"]) => path.join(imageDir, `${name}.jpg`);
const tmpRaw = (name: FeatureSpec["name"]) => path.join(tmpDir, `${name}.raw.mp4`);

const encodeArgs = [
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-preset",
  "veryfast",
  "-crf",
  "24",
  "-movflags",
  "+faststart",
  "-an",
];

const runFfmpeg = (args: string[]) => {
  const res = spawnSync(ffmpegPath as string, args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`ffmpeg failed (exit ${res.status})`);
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseCliArgs(argv: string[]) {
  const args = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]!;
    if (!raw.startsWith("--")) continue;
    const [k, v] = raw.split("=", 2) as [string, string | undefined];
    if (v !== undefined) {
      args.set(k, v);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(k, next);
      i++;
      continue;
    }
    args.set(k, true);
  }

  const only = args.get("--only");
  const force = args.get("--force") === true;
  const timeoutMinutesRaw =
    args.get("--timeout-minutes") ??
    args.get("--timeoutMinutes") ??
    args.get("--timeout");
  const timeoutMinutes =
    typeof timeoutMinutesRaw === "string" && timeoutMinutesRaw.trim().length > 0
      ? Math.max(1, Number.parseInt(timeoutMinutesRaw, 10) || 0)
      : 20;

  const onlySet =
    typeof only === "string" && only.trim().length > 0
      ? new Set(only.split(",").map((s) => s.trim()).filter(Boolean))
      : null;

  return { onlySet, force, timeoutMinutes };
}

function formatProgress(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (value <= 1) return ` progress=${Math.round(value * 100)}%`;
  if (value <= 100) return ` progress=${Math.round(value)}%`;
  return ` progress=${Math.round(value)}%`;
}

async function downloadToFile(url: string, filePath: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Download failed (${res.status}): ${text || url}`);
  }
  // Node's fetch returns a WHATWG ReadableStream; TS types can differ between lib.dom and node:stream/web.
  // We only need a runtime conversion for piping into fs.
  const nodeStream = Readable.fromWeb(res.body as any);
  await pipeline(nodeStream, createWriteStream(filePath));
}

async function generateOne(
  provider: EvolinkProvider,
  spec: FeatureSpec,
  options: {
    model: string;
    duration: number;
    aspectRatio: string;
    quality: string;
    force?: boolean;
    timeoutMinutes: number;
  }
) {
  // Skip if outputs already exist (supports resume).
  if (!options.force) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const [v, p] = await Promise.all([stat(outVideo(spec.name)), stat(outPoster(spec.name))]);
      if (v.size > 80_000 && p.size > 3_000) {
        console.log(`\n==> Skipping ${spec.name} (already exists)`);
        return;
      }
    } catch {
      // missing: continue
    }
  }

  console.log(`\n==> Generating ${spec.name} ...`);

  const task = await provider.createTask({
    model: options.model,
    prompt: spec.prompt,
    duration: options.duration,
    aspectRatio: options.aspectRatio,
    quality: options.quality,
    removeWatermark: true,
  });

  console.log(`Task created: ${task.taskId}`);

  const startedAt = Date.now();
  let attempt = 0;
  while (true) {
    const status = await provider.getTaskStatus(task.taskId);
    if (status.status === "completed") {
      if (!status.videoUrl) throw new Error(`Task completed but missing videoUrl: ${task.taskId}`);
      console.log(`Completed: ${task.taskId}`);
      console.log(`Video URL: ${status.videoUrl}`);
      break;
    }
    if (status.status === "failed") {
      throw new Error(`Task failed: ${task.taskId} ${status.error?.message || "(no message)"}`);
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const progress = formatProgress(status.progress);
    const nextWaitMs = Math.min(15_000, 2_500 + attempt * 750);
    console.log(
      `... ${spec.name} status=${status.status}${progress} elapsed=${elapsed}s (wait ${Math.round(
        nextWaitMs / 1000
      )}s)`
    );
    await sleep(nextWaitMs);
    attempt++;

    if (elapsed > options.timeoutMinutes * 60) {
      throw new Error(`Task timeout (>${options.timeoutMinutes}min): ${task.taskId}`);
    }
  }

  const final = await provider.getTaskStatus(task.taskId);
  if (final.status !== "completed" || !final.videoUrl) {
    throw new Error(`Unexpected final status for ${task.taskId}: ${final.status}`);
  }

  await downloadToFile(final.videoUrl, tmpRaw(spec.name));
  const rawStat = await stat(tmpRaw(spec.name));
  if (rawStat.size < 50_000) {
    throw new Error(`Raw video too small (${rawStat.size} bytes): ${spec.name}`);
  }

  runFfmpeg([
    "-y",
    "-i",
    tmpRaw(spec.name),
    "-t",
    String(options.duration),
    "-vf",
    "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=30,format=yuv420p",
    ...encodeArgs,
    outVideo(spec.name),
  ]);

  const outStat = await stat(outVideo(spec.name));
  if (outStat.size < 80_000) {
    throw new Error(`Output video too small (${outStat.size} bytes): ${spec.name}`);
  }

  runFfmpeg([
    "-y",
    "-ss",
    "00:00:01.0",
    "-i",
    outVideo(spec.name),
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "3",
    outPoster(spec.name),
  ]);

  const posterStat = await stat(outPoster(spec.name));
  if (posterStat.size < 3_000) {
    throw new Error(`Poster too small (${posterStat.size} bytes): ${spec.name}`);
  }

  console.log(`Saved: ${outVideo(spec.name)} (${Math.round(outStat.size / 1024)} KB)`);
  console.log(`Saved: ${outPoster(spec.name)} (${Math.round(posterStat.size / 1024)} KB)`);
}

async function main() {
  const { onlySet, force, timeoutMinutes } = parseCliArgs(process.argv.slice(2));

  const apiKey = process.env.EVOLINK_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-") === false) {
    throw new Error(
      "Missing/invalid EVOLINK_API_KEY. Put it in .env.local and run: corepack pnpm exec dotenv -e .env.local -- tsx scripts/generate-features-videos-ai.ts"
    );
  }

  const provider = new EvolinkProvider(apiKey);

  // Keep it short for marketing previews.
  const model = "seedance-1.5-pro";
  const duration = 4;
  const aspectRatio = "16:9";
  const quality = "720p";

  // Prompts are deliberately different from the 6 showcase videos while still mapping to the features.
  const specs: FeatureSpec[] = [
    {
      name: "text-to-video",
      prompt:
        "Futuristic storyboard animation: abstract glowing lines and panels appear like a script turning into scenes, cinematic lighting, smooth camera push-in, clean minimal background, no readable text, no logos, no watermark.",
    },
    {
      name: "image-to-video",
      prompt:
        "A polaroid photo on a desk comes alive with subtle parallax motion and gentle depth, soft natural light, realistic, cinematic, smooth movement, no readable text, no logos, no watermark.",
    },
    {
      name: "enhancement",
      prompt:
        "Video enhancement concept: split-screen comparison style without any text; left side looks slightly blurry and noisy, right side looks crisp and detailed; smooth transition sweep across, modern cinematic look, no logos, no watermark.",
    },
  ];

  for (const spec of specs) {
    if (onlySet && !onlySet.has(spec.name)) continue;
    await generateOne(provider, spec, {
      model,
      duration,
      aspectRatio,
      quality,
      force,
      timeoutMinutes,
    });
  }

  console.log("\nAll feature preview videos generated.");
  console.log("- videos:", videoDir);
  console.log("- posters:", imageDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
