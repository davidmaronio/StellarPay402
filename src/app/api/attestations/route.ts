/**
 * GET /api/attestations
 *
 * Agent-readable attestation feed for any endpoint in the marketplace.
 * Designed to be called by AI agents choosing between competing tools —
 * no auth required, fully public.
 *
 * Query params (one of the following combos required):
 *   ?endpointId=<uuid>
 *   ?userSlug=alice&slug=weather
 *
 * Optional:
 *   &limit=<n>   max attestations to return (default 50, max 200)
 *
 * Response:
 *   {
 *     endpointId:    string,
 *     endpointName:  string,
 *     proxyUrl:      string,        // callable proxy URL
 *     priceUsdc:     number,
 *     isAiPowered:   boolean,
 *     onChainTxHash: string | null,
 *     avgRating:     number | null,
 *     ratingCount:   number,
 *     attestations: Array<{
 *       id:           string,
 *       rating:       number,
 *       comment:      string | null,
 *       payerAddress: string | null,
 *       txHash:       string | null,   // Soroban tx — verify at stellar.expert
 *       createdAt:    string,
 *     }>
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, endpoints, users, attestations } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;
const BASE_URL      = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stellar-pay402.vercel.app";

// Shared endpoint+userSlug select shape
const endpointFields = {
  id:            endpoints.id,
  name:          endpoints.name,
  slug:          endpoints.slug,
  priceUsdc:     endpoints.priceUsdc,
  isAiPowered:   endpoints.isAiPowered,
  onChainTxHash: endpoints.onChainTxHash,
  userId:        endpoints.userId,
  userSlug:      users.slug,
};

type EndpointRow = {
  id:            string;
  name:          string;
  slug:          string;
  priceUsdc:     number;
  isAiPowered:   boolean;
  onChainTxHash: string | null;
  userId:        string;
  userSlug:      string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const endpointId = searchParams.get("endpointId");
  const userSlug   = searchParams.get("userSlug");
  const slug       = searchParams.get("slug");
  const limitRaw   = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit      = Math.min(isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw, MAX_LIMIT);

  // Resolve the endpoint ------------------------------------------------

  let endpoint: EndpointRow | null = null;

  if (endpointId) {
    const rows = await db
      .select(endpointFields)
      .from(endpoints)
      .innerJoin(users, eq(endpoints.userId, users.id))
      .where(eq(endpoints.id, endpointId))
      .limit(1);

    endpoint = (rows[0] as EndpointRow) ?? null;

  } else if (userSlug && slug) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.slug, userSlug))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db
      .select(endpointFields)
      .from(endpoints)
      .innerJoin(users, eq(endpoints.userId, users.id))
      .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, slug)))
      .limit(1);

    endpoint = (rows[0] as EndpointRow) ?? null;

  } else {
    return NextResponse.json(
      { error: "Provide endpointId or both userSlug and slug" },
      { status: 400 },
    );
  }

  if (!endpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch attestations ---------------------------------------------------

  const rows = await db
    .select()
    .from(attestations)
    .where(eq(attestations.endpointId, endpoint.id))
    .orderBy(desc(attestations.createdAt))
    .limit(limit);

  // Aggregate stats (recomputed from fetched rows) -----------------------
  const ratingCount = rows.length;
  const avgRating =
    ratingCount > 0
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
      : null;

  return NextResponse.json({
    endpointId:    endpoint.id,
    endpointName:  endpoint.name,
    proxyUrl:      `${BASE_URL}/${endpoint.userSlug}/${endpoint.slug}`,
    priceUsdc:     endpoint.priceUsdc,
    isAiPowered:   endpoint.isAiPowered,
    onChainTxHash: endpoint.onChainTxHash,
    avgRating,
    ratingCount,
    attestations: rows.map((a) => ({
      id:           a.id,
      rating:       a.rating,
      comment:      a.comment,
      payerAddress: a.payerAddress,
      txHash:       a.txHash,
      createdAt:    a.createdAt.toISOString(),
    })),
  });
}
