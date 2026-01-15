import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@videofly/auth";

export const { GET, POST } = toNextJsHandler(auth);
