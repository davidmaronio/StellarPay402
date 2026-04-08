import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, endpoints } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { registerEndpointOnChain } from "@/lib/registry";

async function loadOwnedEndpoint(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.id, id), eq(endpoints.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedEndpoint(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body  = await req.json();
  const patch: Record<string, unknown> = {};

  if (typeof body.name           === "string")  patch.name           = body.name;
  if (typeof body.targetUrl      === "string")  patch.targetUrl      = body.targetUrl;
  if (typeof body.description    === "string")  patch.description    = body.description;
  if (typeof body.stellarAddress === "string")  patch.stellarAddress = body.stellarAddress;
  if (typeof body.active         === "boolean") patch.active         = body.active;
  if (typeof body.isAiPowered   === "boolean") patch.isAiPowered    = body.isAiPowered;
  if (body.priceUsdc !== undefined) {
    const n = parseFloat(body.priceUsdc);
    if (!isFinite(n) || n <= 0) return NextResponse.json({ error: "Invalid priceUsdc" }, { status: 400 });
    patch.priceUsdc = n;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  patch.updatedAt = new Date();

  const [updated] = await db
    .update(endpoints)
    .set(patch)
    .where(eq(endpoints.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }   = await params;
  const existing = await loadOwnedEndpoint(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(endpoints).where(eq(endpoints.id, id));
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/endpoints/:id/reanchor — retry the on-chain registration for
 * an endpoint that previously failed (or was created before the registry
 * was deployed). Stores the resulting tx hash on the row.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }   = await params;
  const existing = await loadOwnedEndpoint(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const txHash = await registerEndpointOnChain({
    endpointId:   existing.id,
    ownerAddress: existing.stellarAddress,
    payToAddress: existing.stellarAddress,
    priceStroops: BigInt(Math.round(existing.priceUsdc * 1e7)),
    name:         existing.name,
  });

  if (!txHash) {
    return NextResponse.json(
      { error: "On-chain anchor failed. Check server logs and contract configuration." },
      { status: 502 },
    );
  }

  const [updated] = await db
    .update(endpoints)
    .set({ onChainTxHash: txHash, updatedAt: new Date() })
    .where(eq(endpoints.id, id))
    .returning();

  return NextResponse.json(updated);
}
