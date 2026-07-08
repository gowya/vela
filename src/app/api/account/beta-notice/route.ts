import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await pool.query(
    "UPDATE practitioners SET beta_notice_dismissed_at = now() WHERE id = $1",
    [session.user.id]
  );

  return NextResponse.json({ ok: true });
}
