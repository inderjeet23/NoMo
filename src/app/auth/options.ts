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
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        // surface a stable user id for client usage
        const candidate = (profile as { sub?: string } | undefined)?.sub || (token as unknown as { email?: string }).email;
        if (candidate) {
          (token as unknown as { sub?: string }).sub = candidate;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { accessToken?: string }).accessToken =
        (token as unknown as { accessToken?: string }).accessToken;
      (session.user as unknown as { id?: string }).id =
        (token as unknown as { sub?: string; email?: string }).sub ||
        (token as unknown as { email?: string }).email;
      return session as typeof session & { accessToken?: string };
    },
  },
  pages: {
    signIn: '/onboarding',
  },
};


