import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, endpoints } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.userId, session.user.id))
    .orderBy(endpoints.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug, targetUrl, priceUsdc, stellarAddress, description } = await req.json();

  if (!name || !slug || !targetUrl || !priceUsdc || !stellarAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [endpoint] = await db.insert(endpoints).values({
    userId:         session.user.id,
    name,
    slug:           slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    targetUrl,
    priceUsdc:      parseFloat(priceUsdc),
    stellarAddress,
    description,
  }).returning();

  return NextResponse.json(endpoint, { status: 201 });
}
