import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { randomBytes } from "crypto";

// GET — return current API key (or null)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select({ apiKey: users.apiKey }).from(users).where(eq(users.id, session.user.id));
  return NextResponse.json({ apiKey: user?.apiKey ?? null });
}

// POST — generate (or regenerate) API key
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = `sp402_${randomBytes(24).toString("hex")}`;

  await db.update(users).set({ apiKey }).where(eq(users.id, session.user.id));

  return NextResponse.json({ apiKey });
}
