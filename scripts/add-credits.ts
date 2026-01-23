#!/usr/bin/env tsx
/**
 * ============================================
 * 给用户增加积分
 * ============================================
 *
 * 用法:
 *   pnpm tsx scripts/add-credits.ts <email> <credits> [reason]
 *
 * 示例:
 *   pnpm tsx scripts/add-credits.ts user@example.com 100 "管理员赠送"
 *   pnpm tsx scripts/add-credits.ts user@example.com 500
 *
 * 注意: 此脚本通过 dotenv-cli 加载 .env.local 环境变量
 */

import { db } from "@/db";
import { users, creditPackages, creditTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { CreditTransType, CreditPackageStatus } from "@/db/schema";

const email = process.argv[2];
const creditsAmount = parseInt(process.argv[3], 10);
const reason = process.argv[4] || "System add credits";

if (!email || isNaN(creditsAmount) || creditsAmount <= 0) {
  console.error("❌ Usage: pnpm tsx scripts/add-credits.ts <email> <credits> [reason]");
  console.error("   Example: pnpm tsx scripts/add-credits.ts user@example.com 100");
  process.exit(1);
}

async function run() {
  try {
    // 1. 查找用户
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userList.length === 0) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
      return;
    }

    const user = userList[0];
    console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);

    // 2. 计算过期时间（默认365天）
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 365);

    // 3. 创建积分包
    const orderNo = `ADMIN_${Date.now()}`;
    const [pkgResult] = await db
      .insert(creditPackages)
      .values({
        userId: user.id,
        initialCredits: creditsAmount,
        remainingCredits: creditsAmount,
        frozenCredits: 0,
        transType: CreditTransType.SYSTEM_ADJUST,
        orderNo,
        status: CreditPackageStatus.ACTIVE,
        expiredAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: creditPackages.id });

    if (!pkgResult) {
      console.log("❌ Failed to create credit package");
      process.exit(1);
      return;
    }

    // 4. 记录交易
    const transNo = `TXN${Date.now()}${nanoid(6).toUpperCase()}`;
    await db.insert(creditTransactions).values({
      transNo,
      userId: user.id,
      transType: CreditTransType.SYSTEM_ADJUST,
      credits: creditsAmount,
      balanceAfter: creditsAmount, // 简化处理，实际应计算总余额
      packageId: pkgResult.id,
      orderNo,
      remark: reason,
      createdAt: new Date(),
    });

    console.log(`✅ Successfully added ${creditsAmount} credits to ${email}`);
    console.log(`   Package ID: ${pkgResult.id}`);
    console.log(`   Expires: ${expiredAt.toISOString().substring(0, 10)}`);
    console.log(`   Reason: ${reason}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
