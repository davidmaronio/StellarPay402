/**
 * Self-hosted x402 Facilitator — embedded in Next.js.
 * Verifies and settles Stellar testnet x402 payments via @x402/stellar.
 *
 * Routes:
 *   GET  /api/facilitator/supported  → list supported networks
 *   POST /api/facilitator/verify     → verify a payment payload
 *   POST /api/facilitator/settle     → settle a verified payment
 *   GET  /api/facilitator/health     → liveness check
 */

import { NextRequest, NextResponse } from "next/server";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/facilitator";
import { x402Facilitator } from "@x402/core/facilitator";

let _facilitator: x402Facilitator | null = null;

function getFacilitator(): x402Facilitator {
  if (_facilitator) return _facilitator;

  const secretKey = process.env.FACILITATOR_SECRET_KEY;
  if (!secretKey) throw new Error("FACILITATOR_SECRET_KEY not set");

  const signer = createEd25519Signer(secretKey);
  const scheme = new ExactStellarScheme([signer], {
    rpcConfig: { url: process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org" },
  });

  _facilitator = new x402Facilitator();
  _facilitator.register("stellar:testnet", scheme);
  return _facilitator;
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const action = path[0] ?? "";

  // Health
  if (action === "health" || (req.method === "GET" && !action)) {
    return NextResponse.json({ status: "ok", service: "stellarpay402-facilitator" });
  }

  // Supported networks
  if (req.method === "GET" && action === "supported") {
    try {
      const f = getFacilitator();
      return NextResponse.json(f.getSupported());
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Verify
  if (req.method === "POST" && action === "verify") {
    try {
      const { paymentPayload, paymentRequirements } = await req.json();
      const result = await getFacilitator().verify(paymentPayload, paymentRequirements);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 400 });
    }
  }

  // Settle
  if (req.method === "POST" && action === "settle") {
    try {
      const { paymentPayload, paymentRequirements } = await req.json();
      const result = await getFacilitator().settle(paymentPayload, paymentRequirements);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const GET  = handler;
export const POST = handler;
