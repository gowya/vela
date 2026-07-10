import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { SPECIALTY_VALUES } from "@/lib/specialties";

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(80),
  specialty: z.enum(SPECIALTY_VALUES, {
    errorMap: () => ({ message: "Sélectionnez une spécialité." }),
  }),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { firstName, lastName, specialty } = parsed.data;

  await pool.query(
    `UPDATE practitioners
     SET first_name = $1, last_name = $2, specialty = $3, onboarding_completed_at = now()
     WHERE id = $4`,
    [firstName, lastName, specialty, session.user.id]
  );

  return NextResponse.json({ ok: true });
}
