import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "Vela <onboarding@resend.dev>";

// IDs des templates créés dans le dashboard Resend (Templates > slug affiché
// sous le nom). Les variables passées ci-dessous doivent correspondre aux
// placeholders {{...}} définis dans chaque template — voir emails/*.html.
const TEMPLATE_IDS = {
  emailConfirmation: "email-confirmation",
  welcomeEmail: "welcome-email",
  accountDeletionConfirmation: "account-deletion-confirmation",
} as const;

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
      from: FROM,
      to,
      template: {
        id: TEMPLATE_IDS.accountDeletionConfirmation,
        variables: {
          deleted_at: formattedDate,
          patients_count: String(patientsCount),
          consultations_count: String(consultationsCount),
        },
      },
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
      from: FROM,
      to,
      template: {
        id: TEMPLATE_IDS.emailConfirmation,
        variables: {
          verify_url: verifyUrl,
        },
      },
    });
  } catch (err) {
    console.error("[email] échec envoi de vérification", err);
  }
}

export async function sendWelcomeEmail(to: string, firstName: string) {
  const newPatientUrl = `${process.env.NEXTAUTH_URL}/patients`;
  const supportEmail = process.env.SUPPORT_EMAIL ?? "bonjour@vela-app.fr";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to,
      template: {
        id: TEMPLATE_IDS.welcomeEmail,
        variables: {
          first_name: firstName,
          new_patient_url: newPatientUrl,
          support_email: supportEmail,
        },
      },
    });
  } catch (err) {
    console.error("[email] échec envoi de bienvenue", err);
  }
}
