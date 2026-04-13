/**
 * On-chain bridge to the EndpointRegistry Soroban contract.
 *
 * This module is intentionally non-blocking: if the contract is not
 * deployed (no REGISTRY_CONTRACT_ID env var) the function logs and
 * returns. The marketplace works fine without it; the contract is
 * the trust-anchor layer that lets agents independently audit listings.
 */
import {
  Keypair, Networks, TransactionBuilder, BASE_FEE,
  Address, nativeToScVal, xdr, rpc, Contract,
} from "@stellar/stellar-sdk";

const RPC_URL          = process.env.STELLAR_RPC_URL          ?? "https://soroban-testnet.stellar.org";
const REGISTRY_ID      = process.env.REGISTRY_CONTRACT_ID;
const REGISTRY_SECRET  = process.env.REGISTRY_SUBMITTER_SECRET ?? process.env.FACILITATOR_SECRET_KEY;
const NETWORK_PASSPHRASE = Networks.TESTNET;

export type RegisterArgs = {
  endpointId:     string;  // UUID string
  ownerAddress:   string;  // G... (Stellar)
  payToAddress:   string;  // G...
  priceStroops:   bigint;  // USDC * 1e7
  name:           string;
  isAiPowered:    boolean; // anchored as is_ai_powered on-chain
};

function uuidToBytes16(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`bad uuid: ${uuid}`);
  return Buffer.from(hex, "hex");
}

/**
 * Submits a `register` call to the EndpointRegistry contract.
 * Returns the tx hash on success, or null if the registry is not configured.
 *
 * Note: this is a best-effort call. We catch all errors so endpoint
 * creation never fails because of registry issues.
 */
export type AttestArgs = {
  endpointId:   string; // UUID
  rating:       number; // 1–5
  comment:      string;
  payerAddress?: string; // G... — caller's real Stellar address for attribution
};

/**
 * Submits an `attest` call to the EndpointRegistry contract.
 * Uses the submitter key as the on-chain "payer" (signing authority).
 * Returns the tx hash on success, or null if registry is not configured.
 */
export async function attestEndpointOnChain(args: AttestArgs): Promise<string | null> {
  if (!REGISTRY_ID || !REGISTRY_SECRET) return null;
  try {
    const submitter = Keypair.fromSecret(REGISTRY_SECRET);
    const server    = new rpc.Server(RPC_URL);
    const account   = await server.getAccount(submitter.publicKey());
    const contract  = new Contract(REGISTRY_ID);
    const idBytes   = uuidToBytes16(args.endpointId);

    // Use the caller's real Stellar address for on-chain attribution.
    // Falls back to the submitter key if none was provided.
    const payerAddress = args.payerAddress ?? submitter.publicKey();

    const op = contract.call(
      "attest",
      nativeToScVal(idBytes,               { type: "bytes" }),
      new Address(payerAddress).toScVal(),
      nativeToScVal(args.rating,           { type: "u32" }),
      xdr.ScVal.scvString(args.comment),
    );

    const built = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const prepared = await server.prepareTransaction(built);
    prepared.sign(submitter);
    const sendRes = await server.sendTransaction(prepared);
    if (sendRes.status !== "PENDING") {
      console.warn("[registry] attest not pending:", sendRes);
      return null;
    }
    console.log("[registry] attested on-chain, tx:", sendRes.hash);
    return sendRes.hash;
  } catch (err) {
    console.warn("[registry] on-chain attest failed (non-fatal):", err);
    return null;
  }
}

// NOTE: The deployed contract (CCCCETOW...XYA7) is the pre-is_ai_powered version.
// The updated contract source (contracts/endpoint_registry/src/lib.rs) includes
// is_ai_powered in EndpointRecord and register(). Redeploy + update
// REGISTRY_CONTRACT_ID to activate on-chain AI badge anchoring.
// Until then, is_ai_powered is stored in Postgres only; all other contract
// calls (attest, get, count) are unaffected.
export async function registerEndpointOnChain(args: RegisterArgs): Promise<string | null> {
  if (!REGISTRY_ID || !REGISTRY_SECRET) {
    console.log("[registry] not configured — skipping on-chain registration");
    return null;
  }

  try {
    const submitter = Keypair.fromSecret(REGISTRY_SECRET);
    const server    = new rpc.Server(RPC_URL);
    const account   = await server.getAccount(submitter.publicKey());

    const contract = new Contract(REGISTRY_ID);
    const idBytes  = uuidToBytes16(args.endpointId);

    // The contract's `register` function calls `owner.require_auth()`,
    // so the address passed as `owner` MUST match whoever signs the
    // transaction. Since the marketplace operator submits on behalf of
    // listings, the submitter is the on-chain "owner" (acting as the
    // anchoring authority); the user's real Stellar address lives in
    // `pay_to` where actual USDC settlement happens.
    const submitterAddress = submitter.publicKey();
    const op = contract.call(
      "register",
      nativeToScVal(idBytes,                          { type: "bytes" }),
      new Address(submitterAddress).toScVal(),
      new Address(args.payToAddress).toScVal(),
      nativeToScVal(args.priceStroops,                { type: "i128" }),
      xdr.ScVal.scvString(args.name),
      xdr.ScVal.scvBool(args.isAiPowered),
    );

    const built = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const prepared = await server.prepareTransaction(built);
    prepared.sign(submitter);

    const sendRes = await server.sendTransaction(prepared);
    if (sendRes.status !== "PENDING") {
      console.warn("[registry] sendTransaction not pending:", sendRes);
      return null;
    }
    console.log("[registry] registered endpoint on-chain, tx:", sendRes.hash);
    return sendRes.hash;
  } catch (err) {
    console.warn("[registry] on-chain registration failed (non-fatal):", err);
    return null;
  }
}
