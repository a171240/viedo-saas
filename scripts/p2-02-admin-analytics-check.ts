import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nearlyEqual(a: number, b: number, epsilon = 1e-6) {
  return Math.abs(a - b) <= epsilon;
}

async function main() {
  const costPerCredit = Number.parseFloat(process.env.COST_PER_CREDIT_USD ?? "");
  assert(Number.isFinite(costPerCredit) && costPerCredit > 0, "COST_PER_CREDIT_USD must be set to a positive number");

  const { db, videos, VideoStatus } = await import("../src/db");
  const { getVideoAnalyticsSummary } = await import("../src/services/admin-analytics");

  const uuid = crypto.randomUUID();
  const now = new Date();

  await db.insert(videos).values({
    uuid,
    userId: "admin_analytics_smoke_user",
    prompt: "admin analytics smoke test",
    model: "wan2.6",
    status: VideoStatus.COMPLETED,
    provider: "evolink",
    externalTaskId: `analytics_${uuid}`,
    creditsUsed: 123,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    isDeleted: false,
  });

  const summary = await getVideoAnalyticsSummary({ days: 1 });
  assert(summary.costPerCreditUsd !== null, "Expected costPerCreditUsd to be non-null");
  assert(nearlyEqual(summary.costPerCreditUsd, costPerCredit), `Expected costPerCreditUsd=${costPerCredit} but got ${summary.costPerCreditUsd}`);

  assert(summary.totals.totalCredits >= 123, "Expected totals.totalCredits to include the inserted video");
  assert(summary.totals.estimatedCostUsd !== null, "Expected totals.estimatedCostUsd to be non-null");
  const expectedTotalCost = summary.totals.totalCredits * costPerCredit;
  assert(
    nearlyEqual(summary.totals.estimatedCostUsd, expectedTotalCost),
    `Estimated cost mismatch: expected=${expectedTotalCost} actual=${summary.totals.estimatedCostUsd}`
  );

  const evolinkRow = summary.byProvider.find((row) => row.provider === "evolink");
  assert(evolinkRow, "Expected evolink provider row to exist");
  assert(evolinkRow.totalCredits >= 123, "Expected evolink totalCredits to include the inserted video");
  if (evolinkRow.totalCredits > 0) {
    assert(typeof evolinkRow.estimatedCostUsd === "number", "Expected evolink estimatedCostUsd to be a number");
    const expectedProviderCost = evolinkRow.totalCredits * costPerCredit;
    assert(
      nearlyEqual(evolinkRow.estimatedCostUsd, expectedProviderCost),
      `Provider estimated cost mismatch: expected=${expectedProviderCost} actual=${evolinkRow.estimatedCostUsd}`
    );
  }

  await db.delete(videos).where(eq(videos.uuid, uuid));

  console.log("P2-02 admin analytics cost check ok");
  // Drizzle/postgres keeps a pool open; exit explicitly for CLI smoke scripts.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
