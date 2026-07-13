import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InlineTextFieldEditor } from "@/components/InlineTextFieldEditor";
import { InlineSelectFieldEditor } from "@/components/InlineSelectFieldEditor";
import { FeedbackForm } from "@/components/FeedbackForm";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPECIALTIES } from "@/lib/specialties";

const ACCOUNT_TABS = ["profil", "billing", "notifications", "feedback", "legal"] as const;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string; tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { verification, tab } = await searchParams;
  const defaultTab = ACCOUNT_TABS.find((value) => value === tab) ?? "profil";

  const { rows } = await pool.query(
    `SELECT first_name, last_name, phone, specialty, email, email_verified_at
     FROM practitioners WHERE id = $1`,
    [session?.user?.id]
  );
  const profile = rows[0] ?? {};

  const { rows: countRows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM patients WHERE practitioner_id = $1) AS patients_count,
       (SELECT COUNT(*) FROM consultations c
          JOIN patients p ON p.id = c.patient_id
          WHERE p.practitioner_id = $1 AND c.deleted_at IS NULL) AS consultations_count`,
    [session?.user?.id]
  );
  const patientsCount = Number(countRows[0]?.patients_count ?? 0);
  const consultationsCount = Number(countRows[0]?.consultations_count ?? 0);

  return (
    <main className="flex min-h-screen min-w-0 flex-col gap-6 px-16 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Compte</h1>

      {verification === "success" && (
        <p className="text-sm text-foreground">Adresse confirmée.</p>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="feedback">Retours</TabsTrigger>
          <TabsTrigger value="legal">Légal</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>
                {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—"}
              </CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="mb-1">Prénom</Label>
                <InlineTextFieldEditor
                  field="firstName"
                  label="Le prénom"
                  initialValue={profile.first_name ?? ""}
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div>
                <Label className="mb-1">Nom</Label>
                <InlineTextFieldEditor
                  field="lastName"
                  label="Le nom"
                  initialValue={profile.last_name ?? ""}
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div>
                <Label className="mb-1">Téléphone</Label>
                <InlineTextFieldEditor
                  field="phone"
                  label="Le téléphone"
                  initialValue={profile.phone ?? ""}
                  minLength={0}
                  maxLength={30}
                  placeholder="Non renseigné"
                  type="tel"
                  inputMode="tel"
                />
              </div>
              <div>
                <Label className="mb-1">Spécialité</Label>
                <InlineSelectFieldEditor
                  field="specialty"
                  label="La spécialité"
                  initialValue={profile.specialty ?? ""}
                  options={SPECIALTIES}
                  placeholder="Non renseignée"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <SignOutButton />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Apparence</span>
                  <ThemeToggle />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 max-w-lg border-destructive/30">
            <CardHeader>
              <CardTitle>Zone dangereuse</CardTitle>
              <CardDescription>
                La suppression de votre compte est définitive : votre profil, vos patients, vos
                consultations et tous les documents associés seront effacés sans possibilité de
                récupération.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAccountDialog
                patientsCount={patientsCount}
                consultationsCount={consultationsCount}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Facturation</CardTitle>
              <CardDescription>
                Vela est gratuit pendant la bêta. La gestion des abonnements et de la facturation
                sera disponible ici dès leur lancement.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Les préférences de notifications (rappels de rendez-vous, résumés d&apos;activité...)
                seront configurables ici prochainement.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Retours</CardTitle>
              <CardDescription>
                Vela est en version bêta. Vos retours nous aident à l&apos;ajuster au plus près de
                votre pratique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Documents légaux</CardTitle>
              <CardDescription>
                Les textes qui encadrent votre utilisation de Vela et le traitement des données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link
                    href="/cgu"
                    target="_blank"
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Conditions générales d&apos;utilisation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/confidentialite"
                    target="_blank"
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sous-traitance"
                    target="_blank"
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Accord de sous-traitance
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    target="_blank"
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Politique de cookies
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mentions-legales"
                    target="_blank"
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Mentions légales
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
