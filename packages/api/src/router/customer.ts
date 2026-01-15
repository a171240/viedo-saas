import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";

import { db, SubscriptionPlan } from "@videofly/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const updateUserNameSchema = z.object({
  name: z.string(),
  userId: z.string(),
});

const insertCustomerSchema = z.object({
  userId: z.string(),
});

export const customerRouter = createTRPCRouter({
  updateUserName: protectedProcedure
    .input(updateUserNameSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      // Use session from context (already verified by protectedProcedure)
      if (userId !== ctx.userId) {
        return { success: false, reason: "no auth" };
      }
      await db
        .updateTable("user")
        .set({
          name: input.name,
        })
        .where("id", "=", userId)
        .execute();
      return { success: true, reason: "" };
    }),

  insertCustomer: protectedProcedure
    .input(insertCustomerSchema)
    .mutation(async ({ input }) => {
      const { userId } = input;
      await db
        .insertInto("Customer")
        .values({
          authUserId: userId,
          plan: SubscriptionPlan.FREE,
        })
        .executeTakeFirst();
    }),

  queryCustomer: protectedProcedure
    .input(insertCustomerSchema)
    .query(async ({ input }) => {
      noStore();
      const { userId } = input;
      try {
        return await db
          .selectFrom("Customer")
          .where("authUserId", "=", userId)
          .executeTakeFirst();
      } catch (e) {
        // Table might not exist or other database error
        // Return null to allow dashboard to handle gracefully
        console.error("Customer query error:", e);
        return null;
      }
    }),
});
