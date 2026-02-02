const parseNumber = (value?: string | null) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export type FailureCodeRule = {
  code: string;
  match: RegExp;
};

export const ADMIN_ANALYTICS_CONFIG = {
  lookbackDays: 30,
  topFailures: 6,
  costPerCreditUsd: parseNumber(process.env.COST_PER_CREDIT_USD),
  failureCodeRules: [
    { code: "insufficient_credits", match: /insufficient credits/i },
    { code: "provider_timeout", match: /timeout|timed out/i },
    { code: "provider_rate_limit", match: /rate limit|too many requests/i },
    { code: "callback_signature", match: /signature|hmac/i },
    { code: "storage_upload", match: /storage|upload/i },
    { code: "invalid_input", match: /invalid|unsupported|not support/i },
    { code: "unknown", match: /.*/ },
  ] satisfies FailureCodeRule[],
};
