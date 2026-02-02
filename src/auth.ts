import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as any;
      },
    }),
  ],
callbacks: {
  async jwt({ token, user }) {
    // Si hay user (login), igual lo completamos desde DB por email
    const email = String((user as any)?.email ?? token.email ?? "").toLowerCase().trim();
    if (email) {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
      }
    }

    // fallback por si vino por credentials
    if (user) {
      token.id = (token as any).id ?? (user as any).id;
      token.role = (token as any).role ?? (user as any).role;
    }

    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = (token as any).id;
      (session.user as any).role = (token as any).role;
    }
    return session;
  },
},

// callbacks: {
//    async jwt({ token, user }) {
//      if (user) {
//        token.id = (user as any).id;
//        token.role = (user as any).role;
//      }
//      return token;
//    },
//    async session({ session, token }) {
//      if (session.user) {
//        (session.user as any).id = (token as any).id;
//        (session.user as any).role = (token as any).role;
//      }
//      return session;
//    },
//  },
};

export default NextAuth(authOptions);
