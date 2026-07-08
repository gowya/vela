import { Resend } from "resend";

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Vela <onboarding@resend.dev>",
      to,
      subject: "Confirmez votre adresse email",
      html: `
        <p>Bienvenue sur Vela.</p>
        <p>Pour confirmer votre adresse email, cliquez sur le lien ci-dessous.</p>
        <p><a href="${verifyUrl}">Confirmer mon adresse email</a></p>
        <p>Ce lien expire dans 24 heures.</p>
        <p>L'équipe Vela</p>
      `,
    });
  } catch (err) {
    console.error("[email] échec envoi de vérification", err);
  }
}
