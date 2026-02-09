import { MODEL_CAPABILITIES } from "../src/config/model-capabilities";
import { DEFAULT_VIDEO_MODELS } from "../src/components/video-generator";

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. expected=${String(expected)} actual=${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${message}. expected=${b} actual=${a}`);
  }
}

async function main() {
  for (const [modelId, cap] of Object.entries(MODEL_CAPABILITIES)) {
    const model = DEFAULT_VIDEO_MODELS.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Missing DEFAULT_VIDEO_MODELS entry for ${modelId}`);
    }

    const expectedDurations = cap.supportedDurations.map((d) => `${d}s`).sort();
    const actualDurations = (model.durations ?? []).slice().sort();
    assertDeepEqual(actualDurations, expectedDurations, `Durations mismatch for ${modelId}`);

    const expectedRatios = cap.supportedRatios.slice().sort();
    const actualRatios = (model.aspectRatios ?? []).slice().sort();
    assertDeepEqual(actualRatios, expectedRatios, `Aspect ratios mismatch for ${modelId}`);

    if (cap.supportedResolutions) {
      const expectedRes = cap.supportedResolutions.slice().sort();
      const actualRes = (model.resolutions ?? []).slice().sort();
      assertDeepEqual(actualRes, expectedRes, `Resolutions mismatch for ${modelId}`);
    }

    if (cap.supportsAudio !== undefined) {
      assertEqual(
        model.supportsAudio === true,
        cap.supportsAudio === true,
        `supportsAudio mismatch for ${modelId}`
      );
    }
  }

  console.log("P0-08 model capabilities ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

