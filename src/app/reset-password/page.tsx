import type { Metadata } from "next";
import Link from "next/link";
import pool from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { AuthShell, authFooterLinkClassName } from "@/components/AuthShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Vela",
};

// Vérifié dès l'affichage, sans consommer le jeton (un simple GET peut venir
// d'un scanner de liens) : un lien expiré se signale avant que le praticien
// ait saisi un nouveau mot de passe.
async function findTokenEmail(token: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT p.email FROM password_reset_tokens t
     JOIN practitioners p ON p.id = t.practitioner_id
     WHERE t.token_hash = $1 AND t.expires_at > now()`,
    [hashPasswordResetToken(token)]
  );
  return rows[0]?.email ?? null;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const email = typeof token === "string" && token ? await findTokenEmail(token) : null;

  const footer = (
    <Link href="/login" className={authFooterLinkClassName}>
      Retour à la connexion
    </Link>
  );

  if (!email || typeof token !== "string") {
    return (
      <AuthShell
        title="Lien expiré"
        description="Ce lien n'est plus valide : il a déjà servi, ou date de plus d'une heure. Demandez-en un nouveau."
        footer={footer}
      >
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Demander un nouveau lien
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      description={
        <>
          Pour le compte <span className="font-medium text-foreground">{email}</span>.
        </>
      }
      footer={footer}
    >
      <ResetPasswordForm token={token} email={email} />
    </AuthShell>
  );
}
