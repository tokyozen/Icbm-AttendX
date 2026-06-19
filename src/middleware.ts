import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/((?!api/auth|api/qr/validate|api/students/lookup|api/attendance/checkin|api/attendance/student|api/v1|s/|_next/static|_next/image|favicon.ico|register).*)",
  ],
};
