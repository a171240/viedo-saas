import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL/POSTGRES_URL env var");
}

const sql = postgres(databaseUrl, {
  max: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
});

export const db = drizzle(sql, { schema });

export * from "./schema";
