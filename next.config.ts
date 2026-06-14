import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force Next.js output file tracing to include the Prisma query engine binary.
  // Without this, the .node native addon is excluded from the serverless bundle
  // and Prisma throws PrismaClientInitializationError at runtime on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*.node"],
  },
};

export default nextConfig;
