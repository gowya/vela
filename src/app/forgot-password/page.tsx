import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authFooterLinkClassName } from "@/components/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Vela",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Indiquez l'email de votre compte. Vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/login" className={authFooterLinkClassName}>
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
