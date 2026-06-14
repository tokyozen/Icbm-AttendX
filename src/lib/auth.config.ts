import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith("/login") || pathname.startsWith("/s/");
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  providers: [],
};
