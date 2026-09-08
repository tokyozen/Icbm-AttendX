import "dotenv/config";
import { defineConfig } from "prisma/config";

// Read DATABASE_URL via plain process.env rather than prisma/config's `env()`
// helper: `env()` validates the variable eagerly at config load, which breaks
// `prisma generate` during `npm install` on Vercel — env vars are not exposed
// in the install phase, and generate needs no database URL. The empty fallback
// keeps this a valid string during generate; migrate/push run with the var set.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
