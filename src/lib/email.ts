import { Resend } from "resend";

export async function sendAccountDeletionEmail(
  to: string,
  {
    deletedAt,
    zipBuffer,
    patientsCount,
    consultationsCount,
  }: { deletedAt: Date; zipBuffer: Buffer; patientsCount: number; consultationsCount: number }
) {
  const formattedDate = deletedAt.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Vela <onboarding@resend.dev>",
      to,
      subject: "Confirmation de suppression de votre compte Vela",
      html: `
        <p>Votre compte Vela et l'ensemble des données associées (${patientsCount} patient(s), ${consultationsCount} consultation(s)) ont été définitivement supprimés le ${formattedDate}.</p>
        <p>Vous trouverez en pièce jointe un export de vos données au format .zip, conservé à titre de justificatif.</p>
        <p>Cette action est irréversible et aucune copie de ces données n'est conservée par Vela.</p>
        <p>L'équipe Vela</p>
      `,
      attachments: [
        {
          filename: `vela-export-${deletedAt.toISOString().slice(0, 10)}.zip`,
          content: zipBuffer,
        },
      ],
    });
  } catch (err) {
    console.error("[email] échec envoi de la confirmation de suppression", err);
  }
}

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
