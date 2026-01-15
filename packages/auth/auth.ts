import { betterAuth } from "better-auth";
import { creem } from "@creem_io/better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import {
  CreditTransType,
  creditService,
} from "@videofly/common/services/credit";
import {
  getProductById,
  getProductExpiryDays,
} from "@videofly/common/config/credits";

import { db } from "./db";
import { env } from "./env.mjs";

const plugins = [
  nextCookies(), // Auto-handle Next.js cookies
  magicLink({
    sendMagicLink: async ({ email, url }) => {
      // Dynamic import to avoid Edge Runtime issues in middleware
      const { MagicLinkEmail, resend, siteConfig } = await import(
        "@videofly/common"
      );

      // Check if user exists to determine email type
      const existingUser = await db
        .selectFrom("user")
        .select(["name", "emailVerified"])
        .where("email", "=", email)
        .executeTakeFirst();

      const userVerified = !!existingUser?.emailVerified;
      const authSubject = userVerified
        ? `Sign-in link for ${(siteConfig as { name: string }).name}`
        : "Activate your account";

      try {
        await resend.emails.send({
          from: env.RESEND_FROM,
          to: email,
          subject: authSubject,
          react: MagicLinkEmail({
            firstName: existingUser?.name ?? "",
            actionUrl: url,
            mailType: userVerified ? "login" : "register",
            siteName: (siteConfig as { name: string }).name,
          }),
          headers: {
            "X-Entity-Ref-ID": new Date().getTime() + "",
          },
        });
      } catch (error) {
        console.error("Failed to send magic link email:", error);
        throw error;
      }
    },
    expiresIn: 300, // 5 minutes
  }),
];

if (env.CREEM_API_KEY) {
  plugins.push(
    creem({
      apiKey: env.CREEM_API_KEY,
      webhookSecret: env.CREEM_WEBHOOK_SECRET,
      testMode: process.env.NODE_ENV !== "production",
      persistSubscriptions: true,
      defaultSuccessUrl: "/dashboard",

      onGrantAccess: async ({ product, customer, metadata }) => {
        const productConfig = getProductById(product.id);
        if (!productConfig) {
          console.error(`[Creem] Unknown product: ${product.id}`);
          return;
        }

        const credits = productConfig.credits;
        if (credits <= 0) return;

        const meta = (metadata ?? {}) as Record<string, unknown>;
        const metaOrderId =
          typeof meta.paymentId === "string"
            ? meta.paymentId
            : typeof meta.subscriptionId === "string"
              ? meta.subscriptionId
              : typeof meta.orderId === "string"
                ? meta.orderId
                : undefined;
        const customerRecord = customer as Record<string, unknown>;
        const customerSubscriptionId =
          typeof customerRecord.subscriptionId === "string"
            ? customerRecord.subscriptionId
            : undefined;

        const orderId = metaOrderId ?? customerSubscriptionId;
        const orderNo = orderId
          ? `creem_${orderId}`
          : `creem_${productConfig.type}_${customer.userId}_${Date.now()}`;

        const existing = await db
          .selectFrom("credit_packages")
          .select("id")
          .where("order_no", "=", orderNo)
          .executeTakeFirst();

        if (existing) {
          console.log(`[Creem] Duplicate webhook ignored: ${orderNo}`);
          return;
        }

        const transType =
          productConfig.type === "subscription"
            ? CreditTransType.SUBSCRIPTION
            : CreditTransType.ORDER_PAY;

        const productName = product?.name ?? productConfig.id;

        await creditService.recharge({
          userId: customer.userId,
          credits,
          orderNo,
          transType,
          expiryDays: getProductExpiryDays(productConfig),
          remark: `Creem payment: ${productName}`,
        });
      },

      onRevokeAccess: async ({ customer, product }) => {
        console.log("Creem access revoked:", { customer, product });
      },
    })
  );
}

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,

  // Kysely adapter - Better Auth native support
  database: {
    db,
    type: "postgres",
  },

  // Plugins
  plugins,

  // GitHub OAuth
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },

  // Custom user fields
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false, // Prevent users from setting this
      },
    },
  },

  // Session configuration
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});

// Extend user type with additional fields
export type User = typeof auth.$Infer.Session.user & {
  isAdmin?: boolean | null;
};

// Session type with extended user
type BaseSession = typeof auth.$Infer.Session;
export type Session = {
  session: BaseSession["session"];
  user: User;
};
