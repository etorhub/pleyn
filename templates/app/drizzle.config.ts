import { defineConfig } from "drizzle-kit";

import { config } from "./src/lib/config.ts";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: config.databaseUrl },
});
