import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verification=expired", url));
  }

  const { rows } = await pool.query(
    "SELECT practitioner_id, expires_at FROM email_verification_tokens WHERE token = $1",
    [token]
  );
  const record = rows[0];

  if (!record || new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?verification=expired", url));
  }

  await pool.query(
    "UPDATE practitioners SET email_verified_at = now() WHERE id = $1",
    [record.practitioner_id]
  );
  await pool.query("DELETE FROM email_verification_tokens WHERE token = $1", [token]);

  return NextResponse.redirect(new URL("/account?verification=success", url));
}
