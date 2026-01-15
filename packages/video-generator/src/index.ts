/**
 * @videofly/video-generator
 *
 * A fully configurable AI video/image generation input component.
 *
 * @example
 * ```tsx
 * import {
 *   VideoGeneratorInput,
 *   type VideoModel,
 *   type GeneratorConfig,
 *   DEFAULT_VIDEO_MODELS,
 * } from "@videofly/video-generator";
 *
 * // Basic usage with defaults
 * <VideoGeneratorInput onSubmit={handleSubmit} />
 *
 * // Custom configuration
 * <VideoGeneratorInput
 *   config={{ videoModels: myModels }}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */

// Main Component
export { VideoGeneratorInput } from "./components/video-generator-input";

// Types
export type {
  // Core types
  GenerationType,
  ModelBadge,
  UploadType,
  ModeIconType,

  // Data models
  VideoModel,
  ImageModel,
  GeneratorMode,
  ImageStyle,
  PromptTemplate,
  UploadedImage,
  UploadSlot,
  OutputNumberOption,

  // Configuration
  GeneratorConfig,
  GeneratorDefaults,
  GeneratorTexts,

  // Submit data
  SubmitData,

  // Credit calculation
  CreditCalculator,

  // Props
  VideoGeneratorInputProps,
} from "./types";

// Defaults (optional - for customization)
export {
  // Individual defaults
  DEFAULT_VIDEO_MODELS,
  DEFAULT_IMAGE_MODELS,
  DEFAULT_VIDEO_MODES,
  DEFAULT_IMAGE_MODES,
  DEFAULT_IMAGE_STYLES,
  DEFAULT_VIDEO_ASPECT_RATIOS,
  DEFAULT_IMAGE_ASPECT_RATIOS,
  DEFAULT_DURATIONS,
  DEFAULT_RESOLUTIONS,
  DEFAULT_QUALITIES,
  DEFAULT_VIDEO_OUTPUT_NUMBERS,
  DEFAULT_IMAGE_OUTPUT_NUMBERS,
  DEFAULT_PROMPT_TEMPLATES,

  // Combined defaults
  DEFAULT_CONFIG,
  DEFAULT_DEFAULTS,

  // Localization
  DEFAULT_TEXTS_EN,
  DEFAULT_TEXTS_ZH,

  // Helper functions
  mergeConfig,
  mergeDefaults,
  getTexts,
} from "./defaults";
