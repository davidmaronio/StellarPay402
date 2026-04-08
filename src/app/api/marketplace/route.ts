import { NextResponse } from "next/server";
import { db, endpoints, users } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id:            endpoints.id,
      name:          endpoints.name,
      slug:          endpoints.slug,
      description:   endpoints.description,
      priceUsdc:     endpoints.priceUsdc,
      totalRequests: endpoints.totalRequests,
      paidRequests:  endpoints.paidRequests,
      isAiPowered:   endpoints.isAiPowered,
      onChainTxHash: endpoints.onChainTxHash,
      createdAt:     endpoints.createdAt,
      userSlug:      users.slug,
      userName:      users.name,
      avgRating: sql<number | null>`(
        SELECT ROUND(AVG(a.rating)::numeric, 1)
        FROM attestations a
        WHERE a.endpoint_id = ${endpoints.id}
      )`,
      ratingCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM attestations a
        WHERE a.endpoint_id = ${endpoints.id}
      )`,
    })
    .from(endpoints)
    .innerJoin(users, eq(endpoints.userId, users.id))
    .where(eq(endpoints.active, true))
    .orderBy(endpoints.paidRequests);

  return NextResponse.json(rows);
}
