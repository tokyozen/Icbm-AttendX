import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure the Prisma query engine binary is bundled in every serverless function.
  // Without this, Next.js file tracing omits the .node native addon and Prisma
  // throws PrismaClientInitializationError at runtime on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*.node"],
    "/api/**": ["./src/generated/prisma/**/*.node"],
  },
};

export default nextConfig;
