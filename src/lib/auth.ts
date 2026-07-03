import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { rows } = await pool.query(
          "SELECT id, email, name, password_hash FROM practitioners WHERE email = $1",
          [credentials.email.toLowerCase()]
        );
        const practitioner = rows[0];
        if (!practitioner) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          practitioner.password_hash
        );
        if (!valid) {
          return null;
        }

        return {
          id: practitioner.id,
          email: practitioner.email,
          name: practitioner.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
