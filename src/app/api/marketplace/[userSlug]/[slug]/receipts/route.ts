import { NextResponse } from "next/server";
import { db, endpoints, payments, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Public receipts feed for a given endpoint.
 * Returns the most recent on-chain Stellar payments to the endpoint's wallet.
 * Used by the public marketplace page to prove "real payments, not slides."
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userSlug: string; slug: string }> },
) {
  const { userSlug, slug } = await params;

  const [user] = await db.select().from(users).where(eq(users.slug, userSlug)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, slug)))
    .limit(1);
  if (!endpoint) return NextResponse.json({ error: "endpoint not found" }, { status: 404 });

  const recent = await db
    .select({
      id:           payments.id,
      payerAddress: payments.payerAddress,
      amountUsdc:   payments.amountUsdc,
      txHash:       payments.txHash,
      network:      payments.network,
      settledAt:    payments.settledAt,
    })
    .from(payments)
    .where(eq(payments.endpointId, endpoint.id))
    .orderBy(desc(payments.settledAt))
    .limit(50);

  return NextResponse.json({
    endpoint: {
      name:           endpoint.name,
      slug:           endpoint.slug,
      priceUsdc:      endpoint.priceUsdc,
      stellarAddress: endpoint.stellarAddress,
      totalRequests:  endpoint.totalRequests,
      paidRequests:   endpoint.paidRequests,
      totalEarned:    endpoint.totalEarned,
    },
    receipts: recent.map(r => ({
      ...r,
      explorerUrl: r.txHash
        ? `https://stellar.expert/explorer/testnet/tx/${r.txHash}`
        : null,
    })),
  });
}
