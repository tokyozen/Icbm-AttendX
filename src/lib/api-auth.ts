import { NextResponse } from "next/server";
import { validateApiKey, getApiKeyFromRequest } from "./api-keys";

// Simple in-memory rate limiter — resets on server restart, sufficient for v1
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120; // requests per window per key
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function requireApiKey(req: Request): Promise<NextResponse | null> {
  const key = getApiKeyFromRequest(req);
  if (!key) {
    return NextResponse.json(
      { error: "Missing API key. Include x-api-key header." },
      { status: 401 }
    );
  }

  if (!checkRateLimit(key)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
  }

  const valid = await validateApiKey(key);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or inactive API key." },
      { status: 403 }
    );
  }
  return null;
}
