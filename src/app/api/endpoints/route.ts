import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, endpoints } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { registerEndpointOnChain } from "@/lib/registry";

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

  const { name, slug, targetUrl, priceUsdc, stellarAddress, description, isAiPowered } = await req.json();

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
    isAiPowered:    Boolean(isAiPowered),
  }).returning();

  // Anchor the endpoint on-chain via the EndpointRegistry contract.
  // Best-effort: failure does not block creation, but if it succeeds we
  // persist the tx hash so the dashboard can show "anchored on-chain".
  const onChainTxHash = await registerEndpointOnChain({
    endpointId:   endpoint.id,
    ownerAddress: stellarAddress,
    payToAddress: stellarAddress,
    priceStroops: BigInt(Math.round(parseFloat(priceUsdc) * 1e7)),
    name,
  });

  if (onChainTxHash) {
    await db
      .update(endpoints)
      .set({ onChainTxHash })
      .where(eq(endpoints.id, endpoint.id));
  }

  return NextResponse.json({ ...endpoint, onChainTxHash }, { status: 201 });
}
