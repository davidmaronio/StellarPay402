import { NextRequest, NextResponse } from "next/server";
import { db, endpoints, users, payments, requestLogs } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const ACCEPT_HEADER = "application/json";

// Build x402 payment required response
function paymentRequired(endpoint: {
  id: string;
  name: string;
  priceUsdc: number;
  stellarAddress: string;
  slug: string;
}, url: string) {
  const body = {
    x402Version: 1,
    error: "Payment Required",
    accepts: [
      {
        scheme: "exact",
        network: "stellar:testnet",
        amount: endpoint.priceUsdc.toFixed(7),
        asset: "USDC",
        payTo: endpoint.stellarAddress,
        maxTimeoutSeconds: 300,
        resource: url,
        description: endpoint.name,
      },
    ],
  };

  return NextResponse.json(body, {
    status: 402,
    headers: {
      "X-Payment-Required": "true",
      "Content-Type": "application/json",
    },
  });
}

async function handler(req: NextRequest, { params }: { params: Promise<{ userSlug: string; path: string[] }> }) {
  const { userSlug, path } = await params;
  const endpointSlug = path[0];
  const remainingPath = path.slice(1).join("/");
  const start = Date.now();

  // 1. Look up user
  const [user] = await db.select().from(users).where(eq(users.slug, userSlug)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 2. Look up endpoint
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, endpointSlug), eq(endpoints.active, true)))
    .limit(1);

  if (!endpoint) return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });

  const proxyUrl = `${endpoint.targetUrl}${remainingPath ? `/${remainingPath}` : ""}${req.nextUrl.search}`;

  // 3. Check for x402 payment header
  const paymentHeader = req.headers.get("X-PAYMENT") || req.headers.get("x-payment");

  if (!paymentHeader) {
    // Log unpaid request
    await db.insert(requestLogs).values({
      endpointId: endpoint.id,
      status: "unpaid",
      createdAt: new Date(),
    });

    // Update total request count
    await db
      .update(endpoints)
      .set({ totalRequests: endpoint.totalRequests + 1 })
      .where(eq(endpoints.id, endpoint.id));

    return paymentRequired(endpoint, req.url);
  }

  // 4. Verify payment with Stellar x402 facilitator
  let payerAddress: string | undefined;
  let txHash: string | undefined;

  try {
    const facilitatorUrl = process.env.STELLAR_FACILITATOR_URL || "https://x402.org/facilitator";
    const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        paymentRequirements: {
          scheme: "exact",
          network: "stellar:testnet",
          amount: endpoint.priceUsdc.toFixed(7),
          asset: "USDC",
          payTo: endpoint.stellarAddress,
          resource: req.url,
        },
      }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      await db.insert(requestLogs).values({
        endpointId: endpoint.id,
        status: "error",
        createdAt: new Date(),
      });
      return NextResponse.json({ error: "Payment verification failed", detail: err }, { status: 402 });
    }

    const verifyData = await verifyRes.json();
    payerAddress = verifyData.payer;

    // 5. Forward request to target
    const forwardHeaders = new Headers();
    req.headers.forEach((val, key) => {
      if (!["host", "x-payment", "x-payment-signature"].includes(key.toLowerCase())) {
        forwardHeaders.set(key, val);
      }
    });
    forwardHeaders.set("Accept", ACCEPT_HEADER);

    const forwardRes = await fetch(proxyUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    });

    const responseBody = await forwardRes.text();
    const latencyMs = Date.now() - start;

    // 6. Settle payment
    const settleRes = await fetch(`${facilitatorUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentHeader, network: "stellar:testnet" }),
    });

    if (settleRes.ok) {
      const settleData = await settleRes.json().catch(() => ({}));
      txHash = settleData.txHash || settleData.transaction;
    }

    // 7. Record payment + log
    const [payment] = await db.insert(payments).values({
      endpointId:   endpoint.id,
      payerAddress: payerAddress,
      amountUsdc:   endpoint.priceUsdc,
      txHash:       txHash,
      network:      "stellar:testnet",
    }).returning();

    await db.insert(requestLogs).values({
      endpointId:     endpoint.id,
      paymentId:      payment.id,
      status:         "paid",
      responseStatus: forwardRes.status,
      latencyMs,
    });

    await db.update(endpoints).set({
      totalRequests: endpoint.totalRequests + 1,
      paidRequests:  endpoint.paidRequests + 1,
      totalEarned:   endpoint.totalEarned + endpoint.priceUsdc,
    }).where(eq(endpoints.id, endpoint.id));

    // 8. Return proxied response
    const responseHeaders = new Headers();
    forwardRes.headers.forEach((val, key) => responseHeaders.set(key, val));
    if (txHash) responseHeaders.set("X-Payment-Receipt", txHash);

    return new NextResponse(responseBody, {
      status: forwardRes.status,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[proxy] error:", err);
    return NextResponse.json({ error: "Proxy error", detail: String(err) }, { status: 500 });
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
