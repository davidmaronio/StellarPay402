/**
 * Re-anchors every active endpoint to the current EndpointRegistry contract.
 * Run this after redeploying the Soroban contract.
 *
 * Usage: node scripts/reanchor-all.mjs
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const require = createRequire(import.meta.url);
const postgres = require("postgres");
const {
  Keypair, Networks, TransactionBuilder, BASE_FEE,
  Address, nativeToScVal, xdr, rpc, Contract,
} = require("@stellar/stellar-sdk");

const RPC_URL           = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const REGISTRY_ID       = process.env.REGISTRY_CONTRACT_ID;
const REGISTRY_SECRET   = process.env.REGISTRY_SUBMITTER_SECRET ?? process.env.FACILITATOR_SECRET_KEY;
const NETWORK_PASSPHRASE = Networks.TESTNET;

if (!REGISTRY_ID || !REGISTRY_SECRET) {
  console.error("REGISTRY_CONTRACT_ID and REGISTRY_SUBMITTER_SECRET must be set");
  process.exit(1);
}

function uuidToBytes16(uuid) {
  const hex = uuid.replace(/-/g, "");
  return Buffer.from(hex, "hex");
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const submitter = Keypair.fromSecret(REGISTRY_SECRET);
const server    = new rpc.Server(RPC_URL);
const contract  = new Contract(REGISTRY_ID);

const endpoints = await sql`SELECT id, name, stellar_address, price_usdc FROM endpoints WHERE active = true`;
console.log(`Found ${endpoints.length} active endpoint(s) to re-anchor.\n`);

for (const ep of endpoints) {
  process.stdout.write(`  → ${ep.name} (${ep.id.slice(0, 8)}…) `);
  try {
    const account     = await server.getAccount(submitter.publicKey());
    const idBytes     = uuidToBytes16(ep.id);
    const priceStroops = BigInt(Math.round(parseFloat(ep.price_usdc) * 1e7));

    const op = contract.call(
      "register",
      nativeToScVal(idBytes,               { type: "bytes" }),
      new Address(submitter.publicKey()).toScVal(),
      new Address(ep.stellar_address).toScVal(),
      nativeToScVal(priceStroops,          { type: "i128" }),
      xdr.ScVal.scvString(ep.name),
    );

    const built = new TransactionBuilder(account, {
      fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
    }).addOperation(op).setTimeout(60).build();

    const prepared = await server.prepareTransaction(built);
    prepared.sign(submitter);
    const sendRes = await server.sendTransaction(prepared);

    if (sendRes.status !== "PENDING") {
      console.log(`SKIP (already registered or error: ${sendRes.status})`);
      continue;
    }

    // Update DB with new tx hash
    await sql`UPDATE endpoints SET on_chain_tx_hash = ${sendRes.hash}, updated_at = NOW() WHERE id = ${ep.id}`;
    console.log(`✓  ${sendRes.hash.slice(0, 12)}…`);

    // Small delay to avoid sequence number collisions
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    // "already registered" is a contract panic — just update hash with existing data
    if (String(err).includes("already registered")) {
      console.log(`already on-chain (skipped)`);
    } else {
      console.log(`ERROR: ${err.message ?? err}`);
    }
  }
}

console.log("\nDone.");
await sql.end();
