import {
  db,
  CreditTransType,
  CreditPackageStatus,
  type CreditPackage,
  type CreditHold,
  type CreditTransaction,
} from "@videofly/db";
import { nanoid } from "nanoid";
import { CREDITS_CONFIG } from "../config/credits";

// Re-export enums for consumers
export { CreditTransType, CreditPackageStatus };

export interface CreditBalance {
  totalCredits: number;      // 总获得积分
  usedCredits: number;       // 已消耗积分
  frozenCredits: number;     // 冻结中积分
  availableCredits: number;  // 可用积分 (total - used - frozen)
  expiringSoon: number;      // 即将过期（7天内）
}

interface PackageAllocation {
  packageId: number;
  credits: number;
}

export class CreditService {
  /**
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const now = new Date();
    const expiringSoonDate = new Date(
      now.getTime() + CREDITS_CONFIG.expiration.warnBeforeDays * 24 * 60 * 60 * 1000
    );

    // 获取所有有效积分包
    const packages = await db
      .selectFrom("credit_packages")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", CreditPackageStatus.ACTIVE)
      .where((eb) =>
        eb.or([
          eb("expired_at", "is", null),
          eb("expired_at", ">", now),
        ])
      )
      .execute();

    let totalCredits = 0;
    let usedCredits = 0;
    let frozenCredits = 0;
    let expiringSoon = 0;

    for (const pkg of packages) {
      totalCredits += pkg.initial_credits;
      usedCredits += pkg.initial_credits - pkg.remaining_credits - pkg.frozen_credits;
      frozenCredits += pkg.frozen_credits;

      // 计算即将过期的可用积分
      if (pkg.expired_at && new Date(pkg.expired_at) <= expiringSoonDate) {
        expiringSoon += pkg.remaining_credits;
      }
    }

    return {
      totalCredits,
      usedCredits,
      frozenCredits,
      availableCredits: packages.reduce((sum, p) => sum + p.remaining_credits, 0),
      expiringSoon,
    };
  }

  /**
   * 冻结积分（任务创建时调用）
   * 使用数据库事务 + 唯一约束保证幂等性
   */
  async freeze(params: {
    userId: string;
    credits: number;
    videoUuid: string;
  }): Promise<{ success: boolean; holdId: number }> {
    const { userId, credits, videoUuid } = params;

    // 注意：Kysely 的事务处理方式与 Prisma 不同
    // 这里使用简化版本，在生产环境可能需要更严格的隔离级别
    return db.transaction().execute(async (trx) => {
      // 检查是否已存在冻结记录（幂等）
      const existingHold = await trx
        .selectFrom("credit_holds")
        .selectAll()
        .where("video_uuid", "=", videoUuid)
        .executeTakeFirst();

      if (existingHold) {
        if (existingHold.status === "HOLDING") {
          return { success: true, holdId: existingHold.id };
        }
        throw new Error(`Hold already processed for video: ${videoUuid}`);
      }

      const now = new Date();

      // 获取有效积分包，按过期时间排序（FIFO）
      const packages = await trx
        .selectFrom("credit_packages")
        .selectAll()
        .where("user_id", "=", userId)
        .where("status", "=", CreditPackageStatus.ACTIVE)
        .where("remaining_credits", ">", 0)
        .where((eb) =>
          eb.or([
            eb("expired_at", "is", null),
            eb("expired_at", ">", now),
          ])
        )
        .orderBy("expired_at", "asc") // 先过期的先用，null 排最后
        .orderBy("created_at", "asc")
        .execute();

      // 计算可用积分
      const availableCredits = packages.reduce((sum, p) => sum + p.remaining_credits, 0);
      if (availableCredits < credits) {
        throw new Error(
          `Insufficient credits. Required: ${credits}, Available: ${availableCredits}`
        );
      }

      // 分配积分包
      const allocation: PackageAllocation[] = [];
      let remaining = credits;

      for (const pkg of packages) {
        if (remaining <= 0) break;

        const toFreeze = Math.min(pkg.remaining_credits, remaining);
        allocation.push({ packageId: pkg.id, credits: toFreeze });

        // 更新积分包：减少可用，增加冻结
        await trx
          .updateTable("credit_packages")
          .set({
            remaining_credits: pkg.remaining_credits - toFreeze,
            frozen_credits: pkg.frozen_credits + toFreeze,
          })
          .where("id", "=", pkg.id)
          .execute();

        remaining -= toFreeze;
      }

      // 创建冻结记录
      const holdResult = await trx
        .insertInto("credit_holds")
        .values({
          user_id: userId,
          video_uuid: videoUuid,
          credits,
          status: "HOLDING",
          package_allocation: JSON.stringify(allocation),
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return { success: true, holdId: holdResult.id };
    });
  }

  /**
   * 结算积分（任务成功时调用）
   */
  async settle(videoUuid: string): Promise<void> {
    await db.transaction().execute(async (trx) => {
      const hold = await trx
        .selectFrom("credit_holds")
        .selectAll()
        .where("video_uuid", "=", videoUuid)
        .executeTakeFirst();

      if (!hold) {
        throw new Error(`Hold not found for video: ${videoUuid}`);
      }

      if (hold.status === "SETTLED") {
        return; // 幂等：已结算
      }

      if (hold.status !== "HOLDING") {
        throw new Error(`Invalid hold status: ${hold.status}`);
      }

      const allocation = (typeof hold.package_allocation === "string"
        ? JSON.parse(hold.package_allocation)
        : hold.package_allocation) as PackageAllocation[];

      // 从各积分包扣除冻结
      for (const { packageId, credits } of allocation) {
        const pkg = await trx
          .selectFrom("credit_packages")
          .selectAll()
          .where("id", "=", packageId)
          .executeTakeFirst();

        if (pkg) {
          await trx
            .updateTable("credit_packages")
            .set({
              frozen_credits: pkg.frozen_credits - credits,
            })
            .where("id", "=", packageId)
            .execute();

          // 检查是否用完
          const updatedPkg = await trx
            .selectFrom("credit_packages")
            .selectAll()
            .where("id", "=", packageId)
            .executeTakeFirst();

          if (updatedPkg && updatedPkg.remaining_credits === 0 && updatedPkg.frozen_credits === 0) {
            await trx
              .updateTable("credit_packages")
              .set({ status: CreditPackageStatus.DEPLETED })
              .where("id", "=", packageId)
              .execute();
          }
        }
      }

      // 更新冻结记录状态
      await trx
        .updateTable("credit_holds")
        .set({
          status: "SETTLED",
          settled_at: new Date(),
        })
        .where("video_uuid", "=", videoUuid)
        .execute();

      // 记录流水
      const balance = await this.getBalanceInTx(trx, hold.user_id);
      await trx
        .insertInto("credit_transactions")
        .values({
          trans_no: `TXN${Date.now()}${nanoid(6)}`,
          user_id: hold.user_id,
          trans_type: CreditTransType.VIDEO_CONSUME,
          credits: -hold.credits,
          balance_after: balance.availableCredits,
          video_uuid: videoUuid,
          hold_id: hold.id,
          remark: `Video generation settled: ${videoUuid}`,
        })
        .execute();
    });
  }

  /**
   * 释放积分（任务失败时调用）
   */
  async release(videoUuid: string): Promise<void> {
    await db.transaction().execute(async (trx) => {
      const hold = await trx
        .selectFrom("credit_holds")
        .selectAll()
        .where("video_uuid", "=", videoUuid)
        .executeTakeFirst();

      if (!hold) {
        throw new Error(`Hold not found for video: ${videoUuid}`);
      }

      if (hold.status === "RELEASED") {
        return; // 幂等：已释放
      }

      if (hold.status !== "HOLDING") {
        throw new Error(`Invalid hold status: ${hold.status}`);
      }

      const allocation = (typeof hold.package_allocation === "string"
        ? JSON.parse(hold.package_allocation)
        : hold.package_allocation) as PackageAllocation[];

      // 退回各积分包
      for (const { packageId, credits } of allocation) {
        const pkg = await trx
          .selectFrom("credit_packages")
          .selectAll()
          .where("id", "=", packageId)
          .executeTakeFirst();

        if (pkg) {
          await trx
            .updateTable("credit_packages")
            .set({
              remaining_credits: pkg.remaining_credits + credits,
              frozen_credits: pkg.frozen_credits - credits,
            })
            .where("id", "=", packageId)
            .execute();
        }
      }

      // 更新冻结记录状态
      await trx
        .updateTable("credit_holds")
        .set({
          status: "RELEASED",
          settled_at: new Date(),
        })
        .where("video_uuid", "=", videoUuid)
        .execute();

      // 记录流水（退回不改变余额，只记录事件）
      const balance = await this.getBalanceInTx(trx, hold.user_id);
      await trx
        .insertInto("credit_transactions")
        .values({
          trans_no: `TXN${Date.now()}${nanoid(6)}`,
          user_id: hold.user_id,
          trans_type: CreditTransType.REFUND,
          credits: 0, // 退回不改变总余额
          balance_after: balance.availableCredits,
          video_uuid: videoUuid,
          hold_id: hold.id,
          remark: `Video generation failed, credits released: ${videoUuid}`,
        })
        .execute();
    });
  }

  /**
   * 充值积分
   */
  async recharge(params: {
    userId: string;
    credits: number;
    orderNo: string;
    transType?: CreditTransType;
    expiryDays?: number;
    remark?: string;
  }): Promise<{ packageId: number }> {
    const transType = params.transType || CreditTransType.ORDER_PAY;
    const expiryDays = params.expiryDays ?? CREDITS_CONFIG.expiration.purchaseDays;
    const expiredAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    return db.transaction().execute(async (trx) => {
      // 创建积分包
      const pkgResult = await trx
        .insertInto("credit_packages")
        .values({
          user_id: params.userId,
          initial_credits: params.credits,
          remaining_credits: params.credits,
          frozen_credits: 0,
          trans_type: transType,
          order_no: params.orderNo,
          status: CreditPackageStatus.ACTIVE,
          expired_at: expiredAt,
          updated_at: new Date(),
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      // 记录流水
      const balance = await this.getBalanceInTx(trx, params.userId);
      await trx
        .insertInto("credit_transactions")
        .values({
          trans_no: `TXN${Date.now()}${nanoid(6)}`,
          user_id: params.userId,
          trans_type: transType,
          credits: params.credits,
          balance_after: balance.availableCredits,
          package_id: pkgResult.id,
          order_no: params.orderNo,
          remark: params.remark || `Recharge: ${params.orderNo}`,
        })
        .execute();

      return { packageId: pkgResult.id };
    });
  }

  /**
   * 新用户赠送积分
   */
  async grantNewUserCredits(userId: string): Promise<void> {
    const { registerGift } = CREDITS_CONFIG;
    if (!registerGift.enabled) return;

    // 检查是否已赠送（幂等）
    const existing = await db
      .selectFrom("credit_packages")
      .selectAll()
      .where("user_id", "=", userId)
      .where("trans_type", "=", CreditTransType.NEW_USER)
      .executeTakeFirst();

    if (existing) return;

    await this.recharge({
      userId,
      credits: registerGift.amount,
      orderNo: `NEW_USER_${userId}`,
      transType: CreditTransType.NEW_USER,
      expiryDays: registerGift.expireDays,
      remark: "New user welcome credits",
    });
  }

  /**
   * 过期积分处理（定时任务调用）
   */
  async expireCredits(): Promise<number> {
    const now = new Date();

    const result = await db
      .updateTable("credit_packages")
      .set({ status: CreditPackageStatus.EXPIRED })
      .where("status", "=", CreditPackageStatus.ACTIVE)
      .where("expired_at", "<=", now)
      .where("remaining_credits", ">", 0)
      .where("frozen_credits", "=", 0) // 避免冻结中的积分被过期
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
  }

  /**
   * 获取积分历史
   */
  async getHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      transType?: CreditTransType;
    }
  ) {
    let query = db
      .selectFrom("credit_transactions")
      .selectAll()
      .where("user_id", "=", userId);

    if (options?.transType) {
      query = query.where("trans_type", "=", options.transType);
    }

    const records = await query
      .orderBy("created_at", "desc")
      .limit(options?.limit || 20)
      .offset(options?.offset || 0)
      .execute();

    let countQuery = db
      .selectFrom("credit_transactions")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("user_id", "=", userId);

    if (options?.transType) {
      countQuery = countQuery.where("trans_type", "=", options.transType);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count ?? 0);

    return { records, total };
  }

  /**
   * 事务内获取余额（内部方法）
   * eslint-disable-next-line @typescript-eslint/no-explicit-any
   */
  private async getBalanceInTx(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trx: any,
    userId: string
  ): Promise<CreditBalance> {
    const now = new Date();
    const packages = await trx
      .selectFrom("credit_packages")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", CreditPackageStatus.ACTIVE)
      .where((eb: any) =>
        eb.or([
          eb("expired_at", "is", null),
          eb("expired_at", ">", now),
        ])
      )
      .execute();

    let totalCredits = 0;
    let usedCredits = 0;
    let frozenCredits = 0;

    for (const pkg of packages) {
      totalCredits += pkg.initial_credits;
      usedCredits += pkg.initial_credits - pkg.remaining_credits - pkg.frozen_credits;
      frozenCredits += pkg.frozen_credits;
    }

    return {
      totalCredits,
      usedCredits,
      frozenCredits,
      availableCredits: packages.reduce((sum: number, p: CreditPackage) => sum + p.remaining_credits, 0),
      expiringSoon: 0,
    };
  }
}

export const creditService = new CreditService();
