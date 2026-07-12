import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "halon_default_development_secret_key_change_me_in_prod",
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        // Add the user ID to the session object
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
