#!/usr/bin/env node
/**
 * @davidmaronio/stellarpay402-mcp
 * -------------------------------
 * An MCP server that bridges any AI assistant (Claude Desktop, Cursor, etc.)
 * to the StellarPay402 marketplace. The AI discovers paid APIs as MCP tools
 * and autonomously pays for them in USDC on Stellar testnet — no human in the loop.
 *
 * Usage in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "stellarpay402": {
 *         "command": "npx",
 *         "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
 *         "env": {
 *           "STELLAR_SECRET_KEY": "S...",
 *           "MARKETPLACE_URL": "https://stellar-pay402.vercel.app",
 *           "MAX_USDC_PER_SESSION": "0.50"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { Keypair } from "@stellar/stellar-sdk";

// ── Config ────────────────────────────────────────────────────────────────
const MARKETPLACE_URL      = process.env.MARKETPLACE_URL      ?? "https://stellar-pay402.vercel.app";
const STELLAR_SECRET_KEY   = process.env.STELLAR_SECRET_KEY;
const MAX_USDC_PER_SESSION = parseFloat(process.env.MAX_USDC_PER_SESSION ?? "0.50");

if (!STELLAR_SECRET_KEY) {
  console.error("[stellarpay402-mcp] STELLAR_SECRET_KEY is required.");
  console.error("[stellarpay402-mcp] Generate one at https://laboratory.stellar.org and fund via Friendbot.");
  process.exit(1);
}

// Validate the secret key
let payerPubKey;
try {
  payerPubKey = Keypair.fromSecret(STELLAR_SECRET_KEY).publicKey();
} catch {
  console.error("[stellarpay402-mcp] Invalid STELLAR_SECRET_KEY.");
  process.exit(1);
}

console.error(`[stellarpay402-mcp] Marketplace: ${MARKETPLACE_URL}`);
console.error(`[stellarpay402-mcp] Payer:       ${payerPubKey}`);
console.error(`[stellarpay402-mcp] Budget cap:  ${MAX_USDC_PER_SESSION} USDC / session`);

// ── Session state ─────────────────────────────────────────────────────────
let sessionSpendUsdc = 0;

// ── Marketplace discovery ─────────────────────────────────────────────────
async function fetchMarketplace() {
  const res = await fetch(`${MARKETPLACE_URL}/api/marketplace`);
  if (!res.ok) throw new Error(`Marketplace fetch failed: HTTP ${res.status}`);
  return res.json();
}

function endpointToTool(ep) {
  // MCP tool name must be alphanumeric+underscore
  const safeName = `${ep.userSlug}_${ep.slug}`.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return {
    name: safeName,
    description: `[Paid API · ${ep.priceUsdc} USDC/call] ${ep.name}${ep.description ? ` — ${ep.description}` : ""}. Provider: ${ep.userName}. Auto-pays via x402 on Stellar testnet.`,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional path segment to append to the API URL (e.g. 'v1/data')",
        },
        query: {
          type: "string",
          description: "Optional query string to append (e.g. 'city=London&units=metric')",
        },
      },
    },
    _stellarpay: ep, // attach the raw endpoint for later use
  };
}

// ── x402 payment ──────────────────────────────────────────────────────────
async function callPaidEndpoint(endpoint, args) {
  const baseUrl = `${MARKETPLACE_URL}/${endpoint.userSlug}/${endpoint.slug}`;
  const path    = args?.path  ? `/${String(args.path).replace(/^\/+/, "")}` : "";
  const query   = args?.query ? `?${String(args.query).replace(/^\?+/, "")}` : "";
  const fullUrl = `${baseUrl}${path}${query}`;

  // 1. Get 402 challenge
  const res402 = await fetch(fullUrl);
  if (res402.status !== 402) {
    // Free or already-paid response
    return await res402.text();
  }
  const body402 = await res402.json();
  const requirement = body402.accepts?.[0];
  if (!requirement) throw new Error("No payment requirements in 402 response");

  // 2. Check budget
  const priceUsdc = parseFloat(requirement.amount) / 1e7;
  if (sessionSpendUsdc + priceUsdc > MAX_USDC_PER_SESSION) {
    throw new Error(
      `Budget cap reached. Spent ${sessionSpendUsdc.toFixed(4)} USDC of ${MAX_USDC_PER_SESSION} USDC budget. ` +
      `This call would cost ${priceUsdc.toFixed(4)} USDC. Increase MAX_USDC_PER_SESSION to continue.`
    );
  }

  // 3. Build x402 payment payload via SDK
  const signer       = createEd25519Signer(STELLAR_SECRET_KEY);
  const clientScheme = new ExactStellarScheme(signer);
  const paymentPayload = await clientScheme.createPaymentPayload(2, {
    scheme:            requirement.scheme,
    network:           requirement.network,
    amount:            requirement.amount,
    asset:             requirement.asset,
    payTo:             requirement.payTo,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds ?? 300,
    resource:          requirement.resource ?? fullUrl,
    description:       requirement.description ?? "",
    extra:             { areFeesSponsored: true },
  });

  const fullPayload = { ...paymentPayload, accepted: requirement };
  const header = Buffer.from(JSON.stringify(fullPayload)).toString("base64");

  // 4. Retry with payment
  const resPaid = await fetch(fullUrl, { headers: { "X-PAYMENT": header } });
  const responseText = await resPaid.text();
  const txHash = resPaid.headers.get("x-payment-receipt");

  if (!resPaid.ok) {
    throw new Error(`Paid request failed: HTTP ${resPaid.status} — ${responseText.slice(0, 200)}`);
  }

  // 5. Update session spend
  sessionSpendUsdc += priceUsdc;

  // 6. Return response with proof of payment
  const explorer = txHash
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
    : "(no tx hash returned)";

  return [
    `✓ Paid ${priceUsdc} USDC on Stellar testnet`,
    `  Payment proof: ${explorer}`,
    `  Session spend: ${sessionSpendUsdc.toFixed(4)} / ${MAX_USDC_PER_SESSION} USDC`,
    "",
    "── API Response ──",
    responseText,
  ].join("\n");
}

// ── MCP server ────────────────────────────────────────────────────────────
const server = new Server(
  { name: "stellarpay402-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// Cache tools so we don't refetch on every list call
let toolsCache = null;
async function getTools() {
  const endpoints = await fetchMarketplace();
  const tools = endpoints.map(endpointToTool);
  toolsCache = new Map(tools.map(t => [t.name, t._stellarpay]));
  // Strip _stellarpay before returning to MCP
  return tools.map(({ _stellarpay, ...rest }) => rest);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const tools = await getTools();
    return { tools };
  } catch (err) {
    console.error("[stellarpay402-mcp] List tools error:", err.message);
    return { tools: [] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Refresh cache if needed
  if (!toolsCache || !toolsCache.has(name)) await getTools();

  const endpoint = toolsCache?.get(name);
  if (!endpoint) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}. Available: ${[...(toolsCache?.keys() ?? [])].join(", ")}` }],
      isError: true,
    };
  }

  try {
    const result = await callPaidEndpoint(endpoint, args);
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("[stellarpay402-mcp] Connected. Waiting for tool calls...");
}).catch((err) => {
  console.error("[stellarpay402-mcp] Fatal:", err);
  process.exit(1);
});
