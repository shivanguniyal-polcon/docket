import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

function createNeon(url: string) {
  return drizzleNeon({ client: new Pool({ connectionString: url }), schema });
}

export type DB = ReturnType<typeof createNeon>;

function resolvePgliteDir(): string {
  if (process.env.PGLITE_DIR) return process.env.PGLITE_DIR;
  if (process.env.VERCEL) return "/tmp/docket-pglite";
  return "./.pglite";
}

function createPglite(): DB {
  const client = new PGlite(resolvePgliteDir());
  return drizzlePglite({ client, schema }) as unknown as DB;
}

const globalForDb = globalThis as unknown as { __docketDb?: DB };

export const db: DB =
  globalForDb.__docketDb ??
  (process.env.DATABASE_URL
    ? createNeon(process.env.DATABASE_URL)
    : createPglite());

globalForDb.__docketDb = db;

export { schema };
