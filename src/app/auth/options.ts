import Google from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const auth: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { accessToken?: string }).accessToken =
        (token as unknown as { accessToken?: string }).accessToken;
      return session as typeof session & { accessToken?: string };
    },
  },
};


