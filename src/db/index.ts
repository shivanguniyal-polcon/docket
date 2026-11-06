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

function getDbInstance(): DB {
  if (!globalForDb.__docketDb) {
    globalForDb.__docketDb = process.env.DATABASE_URL
      ? createNeon(process.env.DATABASE_URL)
      : createPglite();
  }
  return globalForDb.__docketDb;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const instance = getDbInstance();
    const val = Reflect.get(instance as object, prop, receiver);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export { schema };
