import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { openingHoursUpdateSchema } from "@/lib/validation";
import type { OpeningHours } from "@/types";

// Valeurs par défaut affichées quand un jour n'a pas encore été configuré :
// fermé, avec des horaires de journée type pré-remplis pour éviter de partir
// d'un champ vide si le praticien active le jour.
const DEFAULT_DAY = { enabled: false, start: "09:00", end: "18:00" } as const;

function withDefaults(openingHours: OpeningHours): Required<OpeningHours> {
  return {
    mon: openingHours.mon ?? DEFAULT_DAY,
    tue: openingHours.tue ?? DEFAULT_DAY,
    wed: openingHours.wed ?? DEFAULT_DAY,
    thu: openingHours.thu ?? DEFAULT_DAY,
    fri: openingHours.fri ?? DEFAULT_DAY,
    sat: openingHours.sat ?? DEFAULT_DAY,
    sun: openingHours.sun ?? DEFAULT_DAY,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    "SELECT opening_hours FROM practitioners WHERE id = $1",
    [session.user.id]
  );

  return NextResponse.json({
    openingHours: withDefaults((rows[0]?.opening_hours as OpeningHours) ?? {}),
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = openingHoursUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { rows } = await pool.query(
    "UPDATE practitioners SET opening_hours = $1 WHERE id = $2 RETURNING opening_hours",
    [JSON.stringify(parsed.data), session.user.id]
  );

  return NextResponse.json({ openingHours: rows[0]?.opening_hours as OpeningHours });
}
