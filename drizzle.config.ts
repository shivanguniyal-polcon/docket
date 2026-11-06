import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL;

export default url
  ? defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: { url },
    })
  : defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      driver: "pglite",
      dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" },
    });
