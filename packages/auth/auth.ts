import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { MagicLinkEmail, resend, siteConfig } from "@saasfly/common";

import { db } from "./db";
import { env } from "./env.mjs";

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
  plugins: [
    nextCookies(), // Auto-handle Next.js cookies
    magicLink({
      sendMagicLink: async ({ email, url }) => {
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
  ],

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
