import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { SPECIALTY_VALUES } from "@/lib/specialties";

const FIELD_COLUMNS: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  phone: "phone",
  specialties: "specialties",
};

const profileSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("firstName"), value: z.string().trim().min(2).max(80) }),
  z.object({ field: z.literal("lastName"), value: z.string().trim().min(2).max(80) }),
  z.object({ field: z.literal("phone"), value: z.string().trim().max(30) }),
  z.object({ field: z.literal("specialties"), value: z.array(z.enum(SPECIALTY_VALUES)) }),
]);

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { field, value } = parsed.data;
  const column = FIELD_COLUMNS[field];

  const { rows } = await pool.query(
    `UPDATE practitioners SET ${column} = $1 WHERE id = $2 RETURNING ${column} AS value`,
    [value, session.user.id]
  );

  return NextResponse.json({ value: rows[0]?.value ?? value });
}
