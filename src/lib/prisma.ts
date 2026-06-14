import path from "path";
import { PrismaClient } from "@/generated/prisma/client";

// Next.js bundles the generated Prisma client, causing webpack's __dirname to
// point at the bundle output directory instead of src/generated/prisma/.
// Setting PRISMA_QUERY_ENGINE_LIBRARY before first query bypasses dirname-based
// resolution. The binary is deployed via outputFileTracingIncludes in next.config.ts.
if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const engineFile =
    process.platform === "linux"
      ? "libquery_engine-rhel-openssl-3.0.x.so.node"
      : "libquery_engine-darwin.dylib.node";
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.cwd(),
    "src/generated/prisma",
    engineFile
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
