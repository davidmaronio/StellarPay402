/**
 * StellarPay402 — Agent-to-Agent demo script
 *
 * This script plays the role of an AI agent that:
 *   1. Creates its own Stellar testnet wallet (no human involved)
 *   2. Funds itself via Friendbot
 *   3. Gets USDC by swapping XLM on the testnet DEX
 *   4. Discovers a paid AI endpoint on StellarPay402
 *   5. Gets rejected (HTTP 402 — Payment Required)
 *   6. Signs an x402 payment autonomously with @x402/stellar
 *   7. Pays and receives an AI-generated answer
 *   8. Submits a star-rating attestation anchored on Soroban
 *
 * One AI agent sells intelligence. This script is the other agent buying it.
 * Zero humans in the loop.
 *
 * Usage:
 *   node scripts/test-payment.mjs
 *
 * Environment:
 *   PROXY_URL   — override the proxy endpoint (default: the AI answer endpoint)
 *   QUESTION    — the question to ask the AI agent (default provided)
 *   APP_URL     — base URL of the marketplace (default: https://stellar-pay402.vercel.app)
 */

import {
  Keypair, Networks, TransactionBuilder, Operation, Asset, BASE_FEE, Horizon,
} from "@stellar/stellar-sdk";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const APP_URL        = process.env.APP_URL ?? "https://stellar-pay402.vercel.app";
const QUESTION       = process.env.QUESTION ?? "What is the x402 protocol and why does it matter for AI agents?";

// Set PROXY_URL to your registered AI Answer Agent proxy URL, e.g.:
//   PROXY_URL=https://stellar-pay402.vercel.app/{yourSlug}/ai-agent
// The value below is a placeholder — replace it or pass PROXY_URL as an env var.
const PROXY_URL      = process.env.PROXY_URL ?? `${APP_URL}/{yourSlug}/ai-agent`;

const STELLAR_NETWORK = Networks.TESTNET;
const HORIZON_URL     = "https://horizon-testnet.stellar.org";
const USDC_ISSUER     = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC            = new Asset("USDC", USDC_ISSUER);

const server = new Horizon.Server(HORIZON_URL);
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

function banner(text) {
  const line = "─".repeat(text.length + 4);
  console.log(`\n┌${line}┐`);
  console.log(`│  ${text}  │`);
  console.log(`└${line}┘\n`);
}

async function run() {
  banner("StellarPay402 — Agent-to-Agent Payment Demo");

  console.log("Scenario:");
  console.log("  › An AI agent listed an endpoint on StellarPay402 and set a USDC price.");
  console.log("  › This script is a second AI agent. It has no wallet yet.");
  console.log("  › It will create one, fund itself, pay autonomously, and get the answer.");
  console.log("  › No human approves any step.\n");

  // ── Step 1: Agent creates its own wallet ──────────────────────────────────
  console.log("▶ Step 1 — Agent generates a fresh Stellar keypair");
  const payer = Keypair.random();
  console.log(`  Public key : ${payer.publicKey()}`);
  console.log(`  Secret key : ${payer.secret()}`);
  console.log("  (This key can be reused as STELLAR_SECRET_KEY in the MCP server)\n");

  // ── Step 2: Fund via Friendbot ────────────────────────────────────────────
  console.log("▶ Step 2 — Agent funds itself via Stellar Friendbot (testnet faucet)");
  let funded = false;
  for (let attempt = 1; attempt <= 3 && !funded; attempt++) {
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${payer.publicKey()}`);
      if (res.ok) { funded = true; break; }
      console.log(`  attempt ${attempt}: HTTP ${res.status}`);
    } catch (err) {
      console.log(`  attempt ${attempt}: ${err.message}`);
    }
    if (attempt < 3) await sleep(3000);
  }
  if (!funded) throw new Error("Friendbot failed after 3 attempts — retry in a few seconds.");
  console.log("  ✓ Funded with XLM\n");
  await sleep(4000);

  // ── Step 3: Add USDC trustline ────────────────────────────────────────────
  console.log("▶ Step 3 — Agent adds USDC trustline");
  let account = await server.loadAccount(payer.publicKey());
  const trustTx = new TransactionBuilder(account, {
    fee: BASE_FEE, networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(30)
    .build();
  trustTx.sign(payer);
  await server.submitTransaction(trustTx);
  console.log("  ✓ USDC trustline set\n");
  await sleep(4000);

  // ── Step 4: Swap XLM → USDC on the testnet DEX ───────────────────────────
  console.log("▶ Step 4 — Agent swaps XLM for USDC on Stellar testnet DEX");
  account = await server.loadAccount(payer.publicKey());
  const swapTx = new TransactionBuilder(account, {
    fee: (BASE_FEE * 10).toString(), networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: "10",
      destination: payer.publicKey(),
      destAsset: USDC,
      destAmount: "1",
      path: [],
    }))
    .setTimeout(30)
    .build();
  swapTx.sign(payer);
  await server.submitTransaction(swapTx);
  console.log("  ✓ Got 1 USDC — agent is ready to spend\n");
  await sleep(4000);

  // ── Step 5: Call without payment → 402 ───────────────────────────────────
  const targetUrl = PROXY_URL.includes("?")
    ? PROXY_URL
    : `${PROXY_URL}?q=${encodeURIComponent(QUESTION)}`;

  console.log("▶ Step 5 — Agent calls the AI endpoint WITHOUT payment");
  console.log(`  URL      : ${targetUrl}`);
  if (QUESTION) console.log(`  Question : "${QUESTION}"`);
  const res402 = await fetch(targetUrl);
  const body402 = await res402.json();
  console.log(`\n  HTTP ${res402.status} Payment Required ✓`);
  console.log(`  payTo    : ${body402.accepts?.[0]?.payTo ?? "—"}`);
  console.log(`  amount   : ${body402.accepts?.[0]?.amount ?? "—"} stroops USDC`);
  console.log("  (Server refuses — payment required before access)\n");

  const requirement = body402.accepts[0];

  // ── Step 6: Build x402 payment ────────────────────────────────────────────
  console.log("▶ Step 6 — Agent builds and signs x402 payment autonomously");
  const signer       = createEd25519Signer(payer.secret());
  const clientScheme = new ExactStellarScheme(signer);
  const paymentPayload = await clientScheme.createPaymentPayload(2, {
    scheme:            requirement.scheme,
    network:           requirement.network,
    amount:            requirement.amount,
    asset:             requirement.asset,
    payTo:             requirement.payTo,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds ?? 300,
    resource:          requirement.resource ?? targetUrl,
    description:       requirement.description ?? "",
    extra:             { areFeesSponsored: true },
  });
  const fullPayload   = { ...paymentPayload, accepted: requirement };
  const paymentHeader = Buffer.from(JSON.stringify(fullPayload)).toString("base64");
  console.log("  ✓ Payment signed — no human approved this\n");

  // ── Step 7: Pay and get AI response ──────────────────────────────────────
  console.log("▶ Step 7 — Agent retries WITH X-PAYMENT header");
  const resPaid = await fetch(targetUrl, { headers: { "X-PAYMENT": paymentHeader } });
  const receipt = resPaid.headers.get("x-payment-receipt");

  console.log(`\n  HTTP ${resPaid.status}`);

  if (!resPaid.ok) {
    const errBody = await resPaid.text();
    console.error("  Payment failed:", errBody.slice(0, 400));
    process.exit(1);
  }

  let responseBody;
  try {
    responseBody = await resPaid.json();
  } catch {
    responseBody = await resPaid.text();
  }

  console.log("\n  ✓ PAID — AI agent response received:");
  console.log("  ┌─────────────────────────────────────────────");
  if (typeof responseBody === "object" && responseBody.answer) {
    console.log(`  │ Q: ${responseBody.question}`);
    console.log(`  │`);
    const lines = responseBody.answer.match(/.{1,70}/g) ?? [responseBody.answer];
    lines.forEach(l => console.log(`  │ ${l}`));
    console.log(`  │`);
    console.log(`  │ Model     : ${responseBody.model ?? "—"}`);
    console.log(`  │ Latency   : ${responseBody.latencyMs ?? "—"}ms`);
    console.log(`  │ Paid via  : ${responseBody.paidVia ?? "x402 · Stellar testnet"}`);
  } else {
    const text = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody, null, 2);
    text.slice(0, 400).split("\n").forEach(l => console.log(`  │ ${l}`));
  }
  console.log("  └─────────────────────────────────────────────\n");

  if (receipt) {
    console.log(`  ✓ Settlement tx : https://stellar.expert/explorer/testnet/tx/${receipt}`);
  }

  // ── Step 8: Submit on-chain attestation ───────────────────────────────────
  console.log("\n▶ Step 8 — Agent submits a 5-star attestation (anchored on Soroban)");
  try {
    // Parse userSlug and slug from the proxy URL
    const urlPath   = new URL(PROXY_URL).pathname.replace(/\?.*$/, "");
    const parts     = urlPath.split("/").filter(Boolean);
    const userSlug  = parts[0];
    const slug      = parts[1];

    if (userSlug && slug) {
      const attestRes = await fetch(
        `${APP_URL}/api/marketplace/${userSlug}/${slug}/attest`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            rating:       5,
            comment:      "Answered correctly. Payment settled in under 10 seconds. Fully autonomous.",
            payerAddress: payer.publicKey(),
          }),
        },
      );
      const attestData = await attestRes.json();
      if (attestData.txHash) {
        console.log(`  ✓ Attestation tx : https://stellar.expert/explorer/testnet/tx/${attestData.txHash}`);
      } else {
        console.log("  ✓ Attestation saved (registry not configured — stored in DB)");
      }
    }
  } catch (err) {
    console.log(`  ⚠ Attestation skipped: ${err.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  banner("Demo complete");
  console.log("What just happened (agent-to-agent, zero humans):");
  console.log("  1. Agent generated a fresh Stellar keypair");
  console.log("  2. Agent funded itself via Friendbot");
  console.log("  3. Agent acquired USDC by swapping on the testnet DEX");
  console.log("  4. Agent called a paid AI endpoint — got HTTP 402");
  console.log("  5. Agent signed an x402 payment with @x402/stellar");
  console.log("  6. Agent paid and received an AI-generated answer");
  console.log("  7. Agent rated the endpoint — anchored on Soroban\n");
  if (receipt) {
    console.log(`Settlement proof : https://stellar.expert/explorer/testnet/tx/${receipt}`);
  }
  console.log(`Marketplace      : ${APP_URL}/marketplace`);
  console.log(`Receipts page    : ${APP_URL}/marketplace/${new URL(PROXY_URL).pathname.split("/").filter(Boolean).join("/")}\n`);
}

run().catch((e) => {
  console.error("\nFatal:", e?.message ?? e);
  process.exit(1);
});
