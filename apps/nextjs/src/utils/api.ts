import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@videofly/api";

export const api = createTRPCReact<AppRouter>();

export { type RouterInputs, type RouterOutputs } from "@videofly/api";
