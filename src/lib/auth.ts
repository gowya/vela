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
          "SELECT id, email, first_name, last_name, password_hash FROM practitioners WHERE email = $1",
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
          name: [practitioner.first_name, practitioner.last_name].filter(Boolean).join(" "),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (user.name) {
          token.name = user.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;

        if (token.id) {
          const { rows } = await pool.query(
            "SELECT first_name, last_name FROM practitioners WHERE id = $1",
            [token.id]
          );
          const derivedName = [rows[0]?.first_name, rows[0]?.last_name].filter(Boolean).join(" ");
          session.user.name = derivedName || session.user.name || token.name;
        }
      }
      return session;
    },
  },
};
