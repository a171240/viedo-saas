import type { NextRequest } from "next/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";

import { auth, type Session, type User } from "@videofly/auth";

import { transformer } from "./transformer";

interface CreateContextOptions {
  req?: NextRequest;
  session?: Session | null;
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    ...opts,
  };
};

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return createInnerTRPCContext({
    req: opts.req,
    session,
  });
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const procedure = t.procedure;
export const mergeRouters = t.mergeRouters;

export const protectedProcedure = procedure.use(async (opts) => {
  const { session } = opts.ctx;

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      session,
      userId: session.user.id,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async (opts) => {
  const { session } = opts.ctx;
  const user = session?.user as User | undefined;

  if (!user?.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return opts.next({ ctx: opts.ctx });
});
