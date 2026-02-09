#!/usr/bin/env node
/**
 * Regenerate landing "Showcase" demo videos/posters using ffmpeg-static.
 *
 * Why: Demo videos should be visually obvious (not near-black/empty), small,
 * and consistent across deployments (no external asset dependency).
 */

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ffmpegPath from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const videoDir = path.join(repoRoot, "public", "videos", "showcase");
const imageDir = path.join(repoRoot, "public", "images", "showcase");

mkdirSync(videoDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

const run = (args) => {
  const res = spawnSync(ffmpegPath, args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`ffmpeg failed (exit ${res.status})`);
  }
};

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

const makePoster = (videoPath, posterPath) => {
  // -update 1 avoids "image sequence pattern" warnings when writing a single JPEG.
  run([
    "-y",
    "-ss",
    "00:00:01.0",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "3",
    posterPath,
  ]);
};

const out = (name) => path.join(videoDir, `${name}.mp4`);
const poster = (name) => path.join(imageDir, `${name}.jpg`);

// 4s, 30fps, 960x540 (16:9) to match UI.
const D = 4;
const R = 30;
const S = "960x540";

// Nature: rich, cinematic gradient with texture and vignette.
run([
  "-y",
  "-f",
  "lavfi",
  "-i",
  `gradients=s=${S}:r=${R}:d=${D}:seed=7:n=4:c0=0x0b132b:c1=0x1c2541:c2=0x2ec4b6:c3=0xffd166:t=radial:speed=0.02`,
  "-vf",
  "noise=alls=6:allf=t+u,vignette=a=PI/4,eq=contrast=1.06:saturation=1.25:brightness=0.02,format=yuv420p",
  ...encodeArgs,
  out("nature"),
]);
makePoster(out("nature"), poster("nature"));

// Product: clean motion with a floating “card” shape to feel like a UI/product demo.
run([
  "-y",
  "-f",
  "lavfi",
  "-i",
  `gradients=s=${S}:r=${R}:d=${D}:seed=12:n=3:c0=0xf8fafc:c1=0xdbeafe:c2=0xfce7f3:t=linear:speed=0.03`,
  "-vf",
  "drawbox=x=w/2-260+20*sin(2*PI*t/4):y=h/2-150+12*cos(2*PI*t/4):w=520:h=300:color=white@0.08:t=fill,"
    + "drawbox=x=w/2-260+20*sin(2*PI*t/4):y=h/2-150+12*cos(2*PI*t/4):w=520:h=300:color=white@0.25:t=4,"
    + "noise=alls=2:allf=t,eq=contrast=1.04:saturation=1.08,format=yuv420p",
  ...encodeArgs,
  out("product"),
]);
makePoster(out("product"), poster("product"));

// Character: a bright, animated blob (clear motion even in small preview cards).
run([
  "-y",
  "-f",
  "lavfi",
  "-i",
  `gradients=s=${S}:r=${R}:d=${D}:seed=21:n=4:c0=0x0b132b:c1=0x3a0ca3:c2=0x7209b7:c3=0x4cc9f0:t=circular:speed=0.018`,
  "-f",
  "lavfi",
  "-i",
  `color=c=black@0.0:s=${S}:r=${R}:d=${D}`,
  "-filter_complex",
  "[1:v]format=rgba,"
    + "drawbox=x=w/2-90+250*sin(2*PI*t/4):y=h/2-90+140*cos(2*PI*t/4):w=180:h=180:color=#22c55e@1.0:t=fill,"
    + "drawbox=x=w/2-90+250*sin(2*PI*t/4)+18:y=h/2-90+140*cos(2*PI*t/4)-18:w=180:h=180:color=#a855f7@0.65:t=fill,"
    + "gblur=sigma=22:steps=2[blob];"
    + "[0:v][blob]overlay=shortest=1,"
    + "vignette=a=PI/4,noise=alls=2:allf=t+u,eq=contrast=1.08:saturation=1.25,format=yuv420p[v]",
  "-map",
  "[v]",
  ...encodeArgs,
  out("character"),
]);
makePoster(out("character"), poster("character"));

// Space: nebula + starfield blend with slow scroll.
run([
  "-y",
  "-f",
  "lavfi",
  "-i",
  `gradients=s=${S}:r=${R}:d=${D}:seed=33:n=4:c0=0x03045e:c1=0x023e8a:c2=0x7209b7:c3=0x4cc9f0:t=spiral:speed=0.02`,
  "-f",
  "lavfi",
  "-i",
  `color=c=black:s=${S}:r=${R}:d=${D}`,
  "-filter_complex",
  "[1:v]format=yuv420p,noise=alls=80:allf=t+u,"
    + "lutyuv=y='if(gt(val,235),255,0)':u=128:v=128,"
    + "gblur=sigma=1.2,scroll=v=0.02[stars];"
    + "[0:v][stars]blend=all_mode=screen:all_opacity=0.9,"
    + "vignette=a=PI/4,eq=contrast=1.1:saturation=1.1,format=yuv420p[v]",
  "-map",
  "[v]",
  ...encodeArgs,
  out("space"),
]);
makePoster(out("space"), poster("space"));

console.log("\nShowcase assets regenerated:");
console.log("- videos:", videoDir);
console.log("- posters:", imageDir);
