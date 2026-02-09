import { spawn } from "node:child_process";

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

async function resolveBaseURL() {
  const candidates = uniq([
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);

  const probes = ["/en", "/"];
  for (const baseURL of candidates) {
    for (const probe of probes) {
      try {
        const resp = await fetchWithTimeout(`${baseURL}${probe}`, { redirect: "manual" });
        const status = resp.status;
        if (status && status !== 404) return baseURL;
      } catch {
        // ignore connection errors
      }
    }
  }

  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function getTsxBin() {
  const isWin = process.platform === "win32";
  return isWin ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx";
}

async function waitForServer(baseURL, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const resp = await fetchWithTimeout(`${baseURL}/en`, { redirect: "manual" }, 8000);
      const status = resp.status;
      if (status && status !== 404) return true;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function startDevServer(port) {
  const env = {
    ...process.env,
    PORT: String(port),
  };

  const child = spawn("corepack", ["pnpm", "dev"], {
    stdio: "inherit",
    env,
    shell: false,
  });

  return child;
}

async function resolveOrStartBaseURL() {
  try {
    const baseURL = await resolveBaseURL();
    return { baseURL, devServer: null };
  } catch {
    const port = Number.parseInt(process.env.PORT || "3002", 10);
    const baseURL = `http://localhost:${Number.isFinite(port) ? port : 3002}`;

    console.log(`Dev server not running. Starting dev on ${baseURL} ...`);
    const devServer = startDevServer(Number.isFinite(port) ? port : 3002);

    const ok = await waitForServer(baseURL);
    if (!ok) {
      try {
        devServer.kill("SIGINT");
      } catch {
        // ignore
      }
      throw new Error(`Dev server did not become ready at ${baseURL}`);
    }

    return { baseURL, devServer };
  }
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
  const { baseURL, devServer } = await resolveOrStartBaseURL();
  const tsx = getTsxBin();

  const baseEnv = {
    ...process.env,
    BASE_URL: baseURL,
  };

  const steps = [
    { name: "P0-01/P0-02 routes smoke", cmd: "node", args: ["scripts/p0-01-routes-smoke.mjs"] },
    { name: "P0-06 zh i18n smoke", cmd: "node", args: ["scripts/p0-06-zh-smoke.mjs"] },
    { name: "P0-08 model capabilities check", cmd: tsx, args: ["scripts/p0-08-model-capabilities-check.ts"] },
    { name: "P1-01 UI/flow regression", cmd: "node", args: ["scripts/p1-01-ui-flow.mjs"] },
    { name: "P1-02 template build check", cmd: tsx, args: ["scripts/p1-02-template-build-check.ts"] },
    { name: "P1-05 brand kit regression", cmd: "node", args: ["scripts/p1-05-playwright.mjs"] },
    { name: "P2-03/P2-04 safeguards UI", cmd: "node", args: ["scripts/p2-03-04-safeguards-ui.mjs"] },
    { name: "P2-01 recovery smoke", cmd: tsx, args: ["scripts/p2-01-recovery-smoke.ts"] },
    { name: "P2-02 admin analytics cost check", cmd: tsx, args: ["scripts/p2-02-admin-analytics-check.ts"] },
    { name: "P0-10 callback smoke", cmd: tsx, args: ["scripts/p0-10-callback-smoke.ts"] },
    { name: "typecheck", cmd: "corepack", args: ["pnpm", "typecheck"] },
    { name: "lint", cmd: "corepack", args: ["pnpm", "lint"] },
  ];

  console.log(`BASE_URL=${baseURL}`);
  try {
    for (const step of steps) {
      console.log(`\n==> ${step.name}`);
      await runStep(step, baseEnv);
    }

    console.log("\nAll regressions passed.");
  } finally {
    if (devServer) {
      // Stop dev server we started for this run.
      try {
        devServer.kill("SIGINT");
      } catch {
        // ignore
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
