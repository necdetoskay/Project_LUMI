import NextAuth from "next-auth";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.roles = [];
      }
      return session;
    },
  },
});
