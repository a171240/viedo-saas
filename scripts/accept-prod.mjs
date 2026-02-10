import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getVercelDefaultBaseURL() {
  try {
    const url = new URL("../.vercel/project.json", import.meta.url);
    const raw = await readFile(url, "utf8");
    const project = JSON.parse(raw);
    if (project?.projectName) return `https://${project.projectName}.vercel.app`;
  } catch {
    // ignore
  }
  return null;
}

async function resolveBaseURL() {
  // Keep a reasonable default for this repo without forcing users into a specific domain.
  // Override with BASE_URL when using a custom domain.
  const vercelDefault = await getVercelDefaultBaseURL();

  const candidates = uniq([
    process.env.ACCEPT_BASE_URL,
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    vercelDefault,
  ]);

  const probes = ["/en", "/"];
  for (const baseURL of candidates) {
    for (const probe of probes) {
      try {
        const resp = await fetchWithTimeout(`${baseURL}${probe}`, { redirect: "manual" }, 30000);
        const status = resp.status;
        if (status && status !== 404) return baseURL;
      } catch {
        // ignore and try next
      }
    }
  }

  throw new Error(
    `No reachable BASE_URL for prod acceptance. Set BASE_URL or ACCEPT_BASE_URL. candidates=${candidates.join(", ")}`
  );
}

function getTsxBin() {
  const isWin = process.platform === "win32";
  return isWin ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx";
}

function runStep(step, baseEnv) {
  return new Promise((resolve, reject) => {
    const env = { ...baseEnv, ...(step.env || {}) };
    const child = spawn(step.cmd, step.args ?? [], {
      stdio: "inherit",
      env,
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`Step failed (code=${code}): ${step.name}`));
    });
  });
}

async function main() {
  const baseURL = await resolveBaseURL();
  const tsx = getTsxBin();

  const baseEnv = {
    ...process.env,
    BASE_URL: baseURL,
    NEXT_PUBLIC_APP_URL: baseURL,
  };

  // Prod acceptance is intentionally a SAFE subset:
  // - No DB writes
  // - No callback/recover endpoints
  // - No real generation calls (Playwright scripts stub generate/upload/credits/auth)
  const steps = [
    { name: "P0-01/P0-02 routes smoke", cmd: "node", args: ["scripts/p0-01-routes-smoke.mjs"] },
    { name: "P0-03 credibility smoke", cmd: "node", args: ["scripts/p0-03-credibility-smoke.mjs"] },
    { name: "P0-04 pricing smoke", cmd: "node", args: ["scripts/p0-04-pricing-smoke.mjs"] },
    { name: "P0-06 zh i18n smoke", cmd: "node", args: ["scripts/p0-06-zh-smoke.mjs"] },
    { name: "P0-05 reference consistency smoke", cmd: "node", args: ["scripts/p0-05-reference-consistency-smoke.mjs"] },
    { name: "P0-07 credits breakdown smoke", cmd: "node", args: ["scripts/p0-07-credits-breakdown-smoke.mjs"] },
    { name: "P0-09 cookie consent smoke", cmd: "node", args: ["scripts/p0-09-cookie-consent-smoke.mjs"] },
    { name: "P0-08 model capabilities check", cmd: tsx, args: ["scripts/p0-08-model-capabilities-check.ts"] },
    { name: "P1-02 template build check", cmd: tsx, args: ["scripts/p1-02-template-build-check.ts"] },
    { name: "P1-01 UI/flow regression", cmd: "node", args: ["scripts/p1-01-ui-flow.mjs"] },
    { name: "P1-05 brand kit regression", cmd: "node", args: ["scripts/p1-05-playwright.mjs"] },
    { name: "P2-03/P2-04 safeguards UI", cmd: "node", args: ["scripts/p2-03-04-safeguards-ui.mjs"] },
  ];

  console.log(`BASE_URL=${baseURL}`);
  for (const step of steps) {
    console.log(`\n==> ${step.name}`);
    await runStep(step, baseEnv);
  }

  console.log("\nProd acceptance passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
