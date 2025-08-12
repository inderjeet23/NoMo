import NextAuth from "next-auth";
import { auth } from "@/app/auth/options";

// Use the shared auth options so JWT/session callbacks include accessToken
const handler = NextAuth(auth);

export { handler as GET, handler as POST };


