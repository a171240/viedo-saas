import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; details?: unknown } };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ status: number; json: ApiResponse<T> }> {
  const resp = await fetch(url, init);
  const json = (await resp.json()) as ApiResponse<T>;
  return { status: resp.status, json };
}

async function waitForServer(baseURL: string, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const resp = await fetch(`${baseURL}/`, { redirect: "manual" });
      const status = resp.status;
      if (status && status !== 404) return true;
    } catch {
      // keep polling
    }
    await delay(1000);
  }
  return false;
}

function startDevServer(port: number, env: NodeJS.ProcessEnv) {
  return spawn("corepack", ["pnpm", "dev"], {
    stdio: "inherit",
    env: {
      ...env,
      PORT: String(port),
    },
    shell: false,
  });
}

async function ensureSmokeCredits(userEmail: string, amount: number) {
  const { db, users, creditPackages, creditTransactions, CreditTransType, CreditPackageStatus } = await import("../src/db");
  const { nanoid } = await import("nanoid");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);
  assert(user, `Smoke user not found in DB: ${userEmail}`);

  const expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() + 365);

  const orderNo = `SMOKE_${Date.now()}`;
  const [pkgResult] = await db
    .insert(creditPackages)
    .values({
      userId: user.id,
      initialCredits: amount,
      remainingCredits: amount,
      frozenCredits: 0,
      transType: CreditTransType.SYSTEM_ADJUST,
      orderNo,
      status: CreditPackageStatus.ACTIVE,
      expiredAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: creditPackages.id });

  assert(pkgResult, "Failed to create smoke credit package");

  const allPackages = await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.userId, user.id));
  const totalBalance = allPackages.reduce((sum, pkg) => sum + pkg.remainingCredits, 0);

  const transNo = `TXN${Date.now()}${nanoid(6).toUpperCase()}`;
  await db.insert(creditTransactions).values({
    transNo,
    userId: user.id,
    transType: CreditTransType.SYSTEM_ADJUST,
    credits: amount,
    balanceAfter: totalBalance,
    packageId: pkgResult.id,
    orderNo,
    remark: "Real generate smoke credits",
    createdAt: new Date(),
  });
}

async function main() {
  // Guardrail: real provider calls can incur cost. Require explicit opt-in.
  assert(
    process.env.REAL_SMOKE_CONFIRM === "true",
    "Refusing to run. Set REAL_SMOKE_CONFIRM=true to confirm you understand this may incur real provider cost."
  );

  const port = Number.parseInt(process.env.REAL_SMOKE_PORT || "3012", 10);
  assert(Number.isFinite(port) && port > 0, "REAL_SMOKE_PORT must be a valid port");

  const userEmail = process.env.REAL_SMOKE_EMAIL || "real-smoke@example.com";
  const model = process.env.REAL_SMOKE_MODEL || "wan2.6";
  const duration = Number.parseInt(process.env.REAL_SMOKE_DURATION || "5", 10);
  const aspectRatio = process.env.REAL_SMOKE_ASPECT_RATIO || "9:16";
  const quality = process.env.REAL_SMOKE_QUALITY || "720p";
  const creditsTopup = Number.parseInt(process.env.REAL_SMOKE_TOPUP_CREDITS || "500", 10);

  const baseURL = `http://localhost:${port}`;

  console.log(`Starting dev server for real smoke on ${baseURL} ...`);
  const devServer = startDevServer(port, {
    ...process.env,
    BASE_URL: baseURL,
    NEXT_PUBLIC_APP_URL: baseURL,
    DEV_BYPASS_AUTH: "true",
    NEXT_PUBLIC_DEV_BYPASS_AUTH: "true",
    DEV_BYPASS_USER_EMAIL: userEmail,
    ADMIN_EMAIL: userEmail,
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max_old_space_size=4096",
  });

  try {
    const ready = await waitForServer(baseURL);
    assert(ready, `Dev server did not become ready at ${baseURL}`);

    // Trigger dev-bypass user creation.
    const me = await fetchJson<{ id: string; email: string }>(`${baseURL}/api/v1/user/me`, {
      method: "GET",
      redirect: "manual",
    });
    assert(me.status === 200, `Expected /api/v1/user/me 200 but got ${me.status}`);
    assert(me.json.success === true, "Expected /api/v1/user/me success=true");

    // Ensure the user has enough credits so freeze can succeed.
    await ensureSmokeCredits(userEmail, creditsTopup);

    const prompt = `Real smoke test (${new Date().toISOString()}): A serene mountain lake at sunrise, soft mist, cinematic lighting.`;

    const generate = await fetchJson<{
      videoUuid: string;
      taskId: string;
      provider: string;
      status: string;
      creditsUsed: number;
    }>(`${baseURL}/api/v1/video/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        model,
        mode: "text-to-video",
        duration,
        aspectRatio,
        quality,
        outputNumber: 1,
        generateAudio: false,
      }),
    });

    assert(generate.status === 200, `Expected generate 200 but got ${generate.status}`);
    assert(generate.json.success === true, `Generate failed: ${(generate.json as any).error?.message ?? "unknown"}`);

    const { videoUuid, creditsUsed } = (generate.json as any).data as {
      videoUuid: string;
      creditsUsed: number;
    };

    console.log(`Queued videoUuid=${videoUuid} creditsUsed=${creditsUsed}`);

    const started = Date.now();
    const timeoutMs = Number.parseInt(process.env.REAL_SMOKE_TIMEOUT_MS || String(15 * 60 * 1000), 10);
    while (Date.now() - started < timeoutMs) {
      const statusResp = await fetchJson<{ status: string; videoUrl?: string; error?: string }>(
        `${baseURL}/api/v1/video/${encodeURIComponent(videoUuid)}/status`,
        { method: "GET", redirect: "manual" }
      );
      assert(statusResp.status === 200, `Expected status 200 but got ${statusResp.status}`);
      assert(statusResp.json.success === true, "Expected status success=true");

      const data = (statusResp.json as any).data as { status: string; videoUrl?: string; error?: string };
      console.log(`Status=${data.status}`);

      if (data.status === "COMPLETED") {
        assert(data.videoUrl, "Expected completed videoUrl to be present");
        console.log(`Completed videoUrl=${data.videoUrl}`);
        process.exit(0);
      }
      if (data.status === "FAILED") {
        throw new Error(`Generation failed: ${data.error || "unknown error"}`);
      }

      await delay(12_000);
    }

    throw new Error(`Timed out waiting for completion after ${Math.round(timeoutMs / 1000)}s`);
  } finally {
    try {
      devServer.kill("SIGINT");
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

