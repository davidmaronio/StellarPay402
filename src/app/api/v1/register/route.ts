import { NextRequest, NextResponse } from "next/server";
import { db, users, endpoints } from "@/lib/db";
import { eq } from "drizzle-orm";
import { registerEndpointOnChain } from "@/lib/registry";

// Public endpoint — authenticate via API key (sp402_...)
// Usage: POST /api/v1/register
// Headers: Authorization: Bearer sp402_xxx
// Body: { name, slug, targetUrl, priceUsdc, stellarAddress, description?, isAiPowered? }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace("Bearer ", "").trim();

  if (!apiKey || !apiKey.startsWith("sp402_")) {
    return NextResponse.json(
      { error: "Missing or invalid API key. Get yours at https://stellar-pay402.vercel.app/dashboard" },
      { status: 401 }
    );
  }

  const [user] = await db.select().from(users).where(eq(users.apiKey, apiKey));
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, targetUrl, priceUsdc, stellarAddress, description, isAiPowered } = body;

  if (!name || !slug || !targetUrl || !priceUsdc || !stellarAddress) {
    return NextResponse.json(
      { error: "Required: name, slug, targetUrl, priceUsdc, stellarAddress" },
      { status: 400 }
    );
  }

  // Validate URL
  try { new URL(targetUrl); } catch {
    return NextResponse.json({ error: "targetUrl must be a valid URL" }, { status: 400 });
  }

  const price = parseFloat(priceUsdc);
  if (isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "priceUsdc must be a positive number" }, { status: 400 });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const [endpoint] = await db.insert(endpoints).values({
    userId:         user.id,
    name,
    slug:           cleanSlug,
    targetUrl,
    priceUsdc:      price,
    stellarAddress,
    description:    description ?? null,
    isAiPowered:    Boolean(isAiPowered),
  }).returning();

  // Anchor on Soroban
  const onChainTxHash = await registerEndpointOnChain({
    endpointId:   endpoint.id,
    ownerAddress: stellarAddress,
    payToAddress: stellarAddress,
    priceStroops: BigInt(Math.round(price * 1e7)),
    name,
    isAiPowered:  Boolean(isAiPowered),
  });

  if (onChainTxHash) {
    await db.update(endpoints).set({ onChainTxHash }).where(eq(endpoints.id, endpoint.id));
  }

  const proxyUrl = `https://stellar-pay402.vercel.app/${user.slug}/${cleanSlug}`;

  return NextResponse.json({
    success: true,
    endpoint: {
      id:           endpoint.id,
      name,
      slug:         cleanSlug,
      proxyUrl,
      priceUsdc:    price,
      onChainTxHash: onChainTxHash ?? null,
    },
    message: `Your endpoint is live at ${proxyUrl} — buyers pay $${price} USDC per request on Stellar.`,
  }, { status: 201 });
}
