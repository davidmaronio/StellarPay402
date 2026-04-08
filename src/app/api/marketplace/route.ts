import { NextResponse } from "next/server";
import { db, endpoints, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id:             endpoints.id,
      name:           endpoints.name,
      slug:           endpoints.slug,
      description:    endpoints.description,
      priceUsdc:      endpoints.priceUsdc,
      stellarAddress: endpoints.stellarAddress,
      totalRequests:  endpoints.totalRequests,
      paidRequests:   endpoints.paidRequests,
      createdAt:      endpoints.createdAt,
      userSlug:       users.slug,
      userName:       users.name,
    })
    .from(endpoints)
    .innerJoin(users, eq(endpoints.userId, users.id))
    .where(eq(endpoints.active, true))
    .orderBy(endpoints.paidRequests);

  return NextResponse.json(rows);
}
