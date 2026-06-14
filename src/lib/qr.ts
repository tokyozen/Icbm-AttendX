import QRCode from "qrcode";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const QR_SECRET = process.env.QR_SIGNING_SECRET || "fallback-secret-change-this";

export function generateQRToken(): string {
  const uuid = uuidv4();
  const hmac = crypto.createHmac("sha256", QR_SECRET);
  hmac.update(uuid);
  const signature = hmac.digest("hex").slice(0, 16);
  return `${uuid}-${signature}`;
}

export function validateQRToken(token: string): boolean {
  const parts = token.split("-");
  if (parts.length < 6) return false;
  const uuid = parts.slice(0, 5).join("-");
  const signature = parts[5];
  const hmac = crypto.createHmac("sha256", QR_SECRET);
  hmac.update(uuid);
  const expectedSignature = hmac.digest("hex").slice(0, 16);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function generateQRCodeDataURL(token: string, appUrl: string): Promise<string> {
  const url = `${appUrl}/s/${token}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#0F1E35",
      light: "#FFFFFF",
    },
  });
}

export function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
