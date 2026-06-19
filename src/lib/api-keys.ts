import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function generateApiKey(): { key: string; hash: string; preview: string } {
  const key = `sk_attendx_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const preview = `${key.slice(0, 16)}...${key.slice(-4)}`;
  return { key, hash, preview };
}

export async function validateApiKey(key: string): Promise<boolean> {
  if (!key) return false;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!apiKey || !apiKey.isActive) return false;
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });
  return true;
}

export function getApiKeyFromRequest(req: Request): string | null {
  return req.headers.get("x-api-key");
}
