import { NextRequest, NextResponse } from "next/server";
import { db, endpoints, users, payments, requestLogs } from "@/lib/db";
import { eq, and, gte, sql } from "drizzle-orm";

// ── Safety guardrail: hard cap on USDC any single payer can spend per hour
//    across the entire platform. Prevents runaway agents from draining wallets.
const MAX_PAYER_SPEND_PER_HOUR_USDC = parseFloat(
  process.env.MAX_PAYER_SPEND_PER_HOUR_USDC ?? "1.0"
);

async function getPayerHourlySpend(payerAddress: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amountUsdc}), 0)` })
    .from(payments)
    .where(and(eq(payments.payerAddress, payerAddress), gte(payments.settledAt, oneHourAgo)));
  return Number(row?.total ?? 0);
}

const ACCEPT_HEADER  = "application/json";

// Build x402 payment required response
function paymentRequired(endpoint: {
  id: string; name: string; priceUsdc: number; stellarAddress: string; slug: string;
}, url: string) {
  return NextResponse.json({
    x402Version: 2,
    error: "Payment Required",
    accepts: [{
      scheme:            "exact",
      network:           "stellar:testnet",
      amount:            Math.round(endpoint.priceUsdc * 1e7).toString(), // token units (7 decimals)
      asset:             "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA", // USDC SAC testnet
      payTo:             endpoint.stellarAddress,
      maxTimeoutSeconds: 300,
      resource:          url,
      description:       endpoint.name,
      extra:             { areFeesSponsored: true },
    }],
  }, {
    status: 402,
    headers: { "X-Payment-Required": "true" },
  });
}

/**
 * Verify + settle an x402 payment via our self-hosted facilitator.
 */
async function verifyAndSettle(
  paymentPayload: unknown,
  paymentRequirements: unknown,
): Promise<{ ok: boolean; txHash?: string; payer?: string; error?: string }> {
  const facilitatorUrl = process.env.STELLAR_FACILITATOR_URL || "http://localhost:3000/api/facilitator";

  try {
    // Verify
    const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ paymentPayload, paymentRequirements }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return { ok: false, error: `Verify failed: ${JSON.stringify(err)}` };
    }
    const verifyData = await verifyRes.json();
    if (!verifyData.isValid) {
      return { ok: false, error: verifyData.invalidReason ?? "Payment invalid" };
    }

    // Settle
    const settleRes = await fetch(`${facilitatorUrl}/settle`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ paymentPayload, paymentRequirements }),
    });

    if (!settleRes.ok) {
      const err = await settleRes.json().catch(() => ({}));
      return { ok: false, error: `Settle failed: ${JSON.stringify(err)}` };
    }

    const settleData = await settleRes.json();
    return {
      ok:     true,
      txHash: settleData.txHash || settleData.transaction || settleData.hash,
      payer:  settleData.payer  || verifyData.payer,
    };

  } catch (err) {
    return { ok: false, error: String(err) };
  }
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
    await db.insert(requestLogs).values({ endpointId: endpoint.id, status: "unpaid", createdAt: new Date() });
    await db.update(endpoints).set({ totalRequests: endpoint.totalRequests + 1 }).where(eq(endpoints.id, endpoint.id));
    return paymentRequired(endpoint, req.url);
  }

  // 4. Decode payment payload from header
  let paymentPayload: unknown;
  try {
    paymentPayload = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "Invalid X-PAYMENT header encoding" }, { status: 402 });
  }

  // 5. Build payment requirements for facilitator
  const paymentRequirements = {
    scheme:            "exact",
    network:           "stellar:testnet",
    amount:            Math.round(endpoint.priceUsdc * 1e7).toString(),
    asset:             "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    payTo:             endpoint.stellarAddress,
    maxTimeoutSeconds: 300,
    resource:          req.url,
    description:       endpoint.name,
    extra:             { areFeesSponsored: true },
  };

  // 6. Verify + settle via self-hosted facilitator
  const verify = await verifyAndSettle(paymentPayload, paymentRequirements);

  if (!verify.ok) {
    await db.insert(requestLogs).values({ endpointId: endpoint.id, status: "error", createdAt: new Date() });
    return NextResponse.json({ error: "Payment verification failed", detail: verify.error }, { status: 402 });
  }

  // 6b. Safety guardrail — enforce per-payer hourly spending cap.
  // The verify call already proved the payer signed the payment, so we know
  // who is paying. Block runaway agents before they drain a wallet.
  if (verify.payer) {
    const spentLastHour = await getPayerHourlySpend(verify.payer);
    if (spentLastHour + endpoint.priceUsdc > MAX_PAYER_SPEND_PER_HOUR_USDC) {
      await db.insert(requestLogs).values({ endpointId: endpoint.id, status: "error", createdAt: new Date() });
      return NextResponse.json({
        error:                "Spending cap exceeded",
        detail:               `Payer ${verify.payer} has spent ${spentLastHour.toFixed(4)} USDC in the last hour. This call would push them over the ${MAX_PAYER_SPEND_PER_HOUR_USDC} USDC/hour platform safety cap.`,
        spentLastHourUsdc:    spentLastHour,
        capUsdcPerHour:       MAX_PAYER_SPEND_PER_HOUR_USDC,
      }, { status: 402 });
    }
  }

  // 7. Forward request to target API
  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    if (!["host", "x-payment", "x-payment-signature"].includes(key.toLowerCase())) {
      forwardHeaders.set(key, val);
    }
  });
  forwardHeaders.set("Accept", ACCEPT_HEADER);

  const forwardRes = await fetch(proxyUrl, {
    method:  req.method,
    headers: forwardHeaders,
    body:    ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  });

  const responseBody = await forwardRes.text();
  const latencyMs    = Date.now() - start;

  // 8. Record payment + log
  const [payment] = await db.insert(payments).values({
    endpointId:   endpoint.id,
    payerAddress: verify.payer,
    amountUsdc:   endpoint.priceUsdc,
    txHash:       verify.txHash,
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

  // 9. Return proxied response with receipt.
  // We re-encoded the body via forwardRes.text() so any upstream
  // Content-Length / Content-Encoding / Transfer-Encoding values are
  // wrong and cause clients to abort. Strip them — Next.js will set
  // correct ones for the body we hand back.
  const responseHeaders = new Headers();
  const stripped = new Set([
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
  ]);
  forwardRes.headers.forEach((val, key) => {
    if (!stripped.has(key.toLowerCase())) responseHeaders.set(key, val);
  });
  responseHeaders.set("Content-Type", forwardRes.headers.get("content-type") ?? "application/json");
  if (verify.txHash) {
    responseHeaders.set("X-Payment-Receipt", verify.txHash);
    responseHeaders.set("X-Payment-Network", "stellar:testnet");
  }

  return new NextResponse(responseBody, {
    status:  forwardRes.status,
    headers: responseHeaders,
  });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
