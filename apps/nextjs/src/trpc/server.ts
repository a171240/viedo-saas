"use server";

import "server-only";

import { cookies, headers } from "next/headers";
import { loggerLink } from "@trpc/client";
import { experimental_createTRPCNextAppDirServer } from "@trpc/next/app-dir/server";

import type { AppRouter } from "@videofly/api";

import { endingLink, transformer } from "./shared";

export const trpc = experimental_createTRPCNextAppDirServer<AppRouter>({
  config() {
    return {
      ssr: true,
      transformer,
      links: [
        // loggerLink({
        //   enabled: (opts) =>
        //     process.env.NODE_ENV === "development" ||
        //     (opts.direction === "down" && opts.result instanceof Error),
        // }),
        loggerLink({
          enabled: () => true,
        }),
        endingLink({
          headers: async () => {
            const h = new Map(await headers());
            h.delete("connection");
            h.delete("transfer-encoding");
            h.set("x-trpc-source", "server");
            h.set("cookie", (await cookies()).toString());
            return Object.fromEntries(h.entries());
          },
        }),
      ],
    };
  },
});

export { type RouterInputs, type RouterOutputs } from "@videofly/api";
