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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPECIALTIES } from "@/lib/specialties";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { verification } = await searchParams;

  const { rows } = await pool.query(
    `SELECT first_name, last_name, phone, specialty, email, email_verified_at
     FROM practitioners WHERE id = $1`,
    [session?.user?.id]
  );
  const profile = rows[0] ?? {};

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Compte</h1>

      {verification === "success" && (
        <p className="text-sm text-foreground">Adresse confirmée.</p>
      )}

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="feedback">Retours</TabsTrigger>
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
      </Tabs>
    </main>
  );
}
