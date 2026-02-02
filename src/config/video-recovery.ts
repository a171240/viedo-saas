export type RecoverableVideoStatus = "PENDING" | "GENERATING" | "UPLOADING";

export const VIDEO_RECOVERY_CONFIG = {
  maxBatchSize: 20,
  // Consider a task stuck if it hasn't been updated within these thresholds.
  statusTimeoutMinutes: {
    PENDING: 10,
    GENERATING: 60,
    UPLOADING: 20,
  } satisfies Record<RecoverableVideoStatus, number>,
  // When provider reports processing/pending for a stuck task, auto-fail it.
  autoFailProcessing: true,
};
