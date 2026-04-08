/**
 * StellarPay402 — end-to-end x402 payment test.
 *
 * Creates a fresh Stellar testnet wallet, funds it via Friendbot,
 * sets up a USDC trustline, swaps a small amount of XLM → USDC on
 * the testnet DEX, calls the proxy without payment (expects 402),
 * builds an x402 payment with @x402/stellar, calls again with the
 * payment header, and prints the resulting Stellar Expert tx link.
 *
 * Usage:
 *   node scripts/test-payment.mjs
 */

import {
  Keypair, Networks, TransactionBuilder, Operation, Asset, BASE_FEE, Horizon,
} from "@stellar/stellar-sdk";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const PROXY_URL = process.env.PROXY_URL ?? "http://localhost:3000/n4buhayk/joke";
const STELLAR_NETWORK = Networks.TESTNET;
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC = new Asset("USDC", USDC_ISSUER);

const server = new Horizon.Server(HORIZON_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log("=== StellarPay402 x402 Payment Test ===\n");

  // 1. Generate payer keypair
  const payer = Keypair.random();
  console.log("Payer public key:", payer.publicKey());
  console.log("Payer secret key:", payer.secret());
  console.log("(save the secret if you want to reuse this wallet, e.g. for STELLAR_SECRET_KEY in mcp-server)");

  // 2. Fund with Friendbot (retry up to 3 times — Friendbot is sometimes flaky)
  console.log("Funding via Friendbot...");
  let funded = false;
  for (let attempt = 1; attempt <= 3 && !funded; attempt++) {
    try {
      const fbRes = await fetch(`https://friendbot.stellar.org?addr=${payer.publicKey()}`);
      if (fbRes.ok) { funded = true; break; }
      const errBody = await fbRes.text().catch(() => "");
      console.log(`  attempt ${attempt}: HTTP ${fbRes.status} ${errBody.slice(0, 120)}`);
    } catch (err) {
      console.log(`  attempt ${attempt}: ${err.message ?? err}`);
    }
    if (attempt < 3) await sleep(3000);
  }
  if (!funded) throw new Error("Friendbot failed after 3 attempts. Try again in a few seconds.");
  console.log("✓ Funded with XLM\n");
  await sleep(4000);

  // 3. Add USDC trustline
  console.log("Setting up USDC trustline...");
  let account = await server.loadAccount(payer.publicKey());
  const trustTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(30)
    .build();
  trustTx.sign(payer);
  await server.submitTransaction(trustTx);
  console.log("✓ USDC trustline set\n");
  await sleep(4000);

  // 4. Swap XLM → USDC via path payment on the testnet DEX
  console.log("Swapping XLM for USDC on testnet DEX...");
  account = await server.loadAccount(payer.publicKey());
  const swapTx = new TransactionBuilder(account, {
    fee: (BASE_FEE * 10).toString(),
    networkPassphrase: STELLAR_NETWORK,
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
  console.log("✓ Got 1 USDC\n");
  await sleep(4000);

  // 5. Call without payment → expect 402
  console.log("Step 1 — Calling proxy WITHOUT payment...");
  const res402 = await fetch(PROXY_URL);
  const body402 = await res402.json();
  console.log(`HTTP ${res402.status} — Payment Required ✓`);
  console.log(`  payTo:  ${body402.accepts[0].payTo}`);
  console.log(`  amount: ${body402.accepts[0].amount} USDC\n`);

  const requirement = body402.accepts[0];

  // 6. Build x402 payment payload via @x402/stellar
  console.log("Step 2 — Building x402 payment payload via @x402/stellar SDK...");
  const signer = createEd25519Signer(payer.secret());
  const clientScheme = new ExactStellarScheme(signer);

  const paymentPayload = await clientScheme.createPaymentPayload(2, {
    scheme: requirement.scheme,
    network: requirement.network,
    amount: requirement.amount,
    asset: requirement.asset,
    payTo: requirement.payTo,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds ?? 300,
    resource: requirement.resource ?? PROXY_URL,
    description: requirement.description ?? "",
    extra: { areFeesSponsored: true },
  });

  // The facilitator's verify expects an `accepted` field naming the
  // requirement the client picked from the 402 `accepts` array.
  const fullPayload = { ...paymentPayload, accepted: requirement };
  const paymentHeader = Buffer.from(JSON.stringify(fullPayload)).toString("base64");
  console.log("✓ Payment payload created\n");

  // 7. Retry with X-PAYMENT header
  console.log("Step 3 — Calling proxy WITH X-PAYMENT header...");
  const resPaid = await fetch(PROXY_URL, { headers: { "X-PAYMENT": paymentHeader } });

  console.log(`\nHTTP ${resPaid.status}`);
  const receipt = resPaid.headers.get("x-payment-receipt");
  if (receipt) console.log("✓ X-Payment-Receipt:", receipt);

  if (resPaid.ok) {
    let body = "";
    try {
      const buf = await resPaid.arrayBuffer();
      body = new TextDecoder("utf-8").decode(buf);
    } catch (err) {
      body = `<could not read response body: ${err.message ?? err}>`;
    }
    console.log("\n✓ SUCCESS — Proxied response (first 300 chars):");
    console.log(body.slice(0, 300));
    console.log("\n🎉 x402 payment flow complete on Stellar testnet!");
    if (receipt) {
      console.log(`   View tx: https://stellar.expert/explorer/testnet/tx/${receipt}`);
    }
  } else {
    const errBody = await resPaid.text();
    console.log("Error response:", errBody.slice(0, 400));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Error:", e?.message ?? e);
  process.exit(1);
});
