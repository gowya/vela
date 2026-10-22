import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/app/login/AuthLayout";
import { authFooterLinkClassName } from "@/app/login/styles";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Vela",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Mot de passe oublié"
      description="Indiquez l'email de votre compte. Vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/login" className={authFooterLinkClassName}>
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
