import { NextRequest, NextResponse } from "next/server";
import { db, endpoints, users, attestations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { attestEndpointOnChain } from "@/lib/registry";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; slug: string }> },
) {
  const { userSlug, slug } = await params;
  const body = await req.json().catch(() => ({}));
  const { rating, comment, payerAddress } = body as {
    rating: number;
    comment?: string;
    payerAddress?: string;
  };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.slug, userSlug)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, slug)))
    .limit(1);
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Best-effort on-chain attestation via Soroban EndpointRegistry
  const txHash = await attestEndpointOnChain({
    endpointId:   endpoint.id,
    rating,
    comment:      comment ?? "",
    payerAddress: payerAddress ?? undefined,
  });

  await db.insert(attestations).values({
    endpointId:   endpoint.id,
    payerAddress: payerAddress ?? null,
    rating,
    comment:      comment ?? null,
    txHash,
  });

  return NextResponse.json({ ok: true, txHash });
}
