import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@saasfly/auth";

export const { GET, POST } = toNextJsHandler(auth);
