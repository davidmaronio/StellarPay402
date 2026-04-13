# How StellarPay402 Works

A complete walkthrough of the agent-to-agent payment loop — from endpoint registration to on-chain reputation.

---

## The Big Picture

```
Developer registers API
        │
        ▼
 StellarPay402 Proxy URL  ◄──── MCP Server broadcasts to AI agents
        │
        ▼
 AI Agent calls tool  ──►  x402 payment signed with Stellar wallet
        │
        ▼
 Proxy verifies + settles USDC on Stellar (~5 s)
        │
        ├──► Upstream API called, response returned
        │
        └──► attest() fired on Soroban EndpointRegistry (on-chain ★★★★★)
```

---

## Step 1 — Register an Endpoint

A developer publishes any HTTP endpoint to the marketplace via the dashboard or CLI:

```bash
npx stellarpay402 register --url https://myapi.com/v1/data --price 0.01 --name "My Data API"
```

Internally this calls `POST /api/v1/register` (API-key authenticated), which:

1. Inserts the endpoint record in Postgres (Drizzle ORM).
2. Fires a best-effort `register()` call to the **Soroban `EndpointRegistry` contract** on Stellar testnet — anchoring the endpoint on-chain with the owner's payout address and price in USDC stroops (1 USDC = 10,000,000 stroops).
3. Returns a **proxy URL** of the form `https://stellar-pay402.vercel.app/{userSlug}/{endpointSlug}`.

The on-chain tx hash is stored in Postgres. If the contract call fails, the endpoint still works — the registry is a trust anchor, not a payment gate.

---

## Step 2 — Discovery via MCP

The published npm package `@davidmaronio/stellarpay402-mcp` runs as an MCP server inside Claude Desktop, Cursor, or any MCP-capable client.

On startup it fetches `GET /api/marketplace`, which returns every active endpoint with:

- Proxy URL, price, asset, network
- Average on-chain rating and review count
- Whether the endpoint is AI-powered

Each endpoint becomes a **callable MCP tool**. The tool description includes the current price so the agent can make an informed decision before paying.

---

## Step 3 — The x402 Payment Flow

When an agent calls a tool, the MCP server sends a request to the proxy URL **without** a payment header first. The proxy responds with:

```
HTTP 402 Payment Required
x-payment-requirements: [{"scheme":"exact","network":"stellar:testnet","maxAmountRequired":"100000","asset":"...USDC...","payTo":"G...","resource":"https://..."}]
```

The MCP server then:

1. **Signs an x402 payment** — builds a Stellar transaction sending `priceUsdc × 1e7` stroops of USDC to the endpoint's payout address, signs it with the configured `STELLAR_SECRET_KEY`, base64-encodes it.
2. **Retries** the proxy request with the `X-PAYMENT: <base64>` header attached.

---

## Step 4 — Proxy Verification & Settlement

The proxy receives the payment header and:

1. **Decodes** the base64 payment envelope.
2. **Calls `/api/facilitator/verify`** — checks the signature, amount, asset, and recipient match the requirements.
3. **Calls `/api/facilitator/settle`** — submits the signed Stellar transaction to the network. Stellar testnet confirms in ~5 seconds.
4. **Per-payer safety cap** — checks total USDC spent by this payer in the last hour. If it would exceed `MAX_PAYER_SPEND_PER_HOUR_USDC` (default $1.00), the request is rejected without charge.

If settlement fails, the proxy returns an error and the agent is not charged.

---

## Step 5 — Upstream API Call

Once payment is settled:

1. The proxy **strips auth headers** and forwards the original request to the real `targetUrl`.
2. Response latency is measured.
3. The payment is recorded in Postgres (`payments` table) and the endpoint's counters are incremented (`paidRequests`, `totalEarned`).

The response is returned to the agent with two extra headers:

```
X-Payment-Receipt: <stellarTxHash>
X-Payment-Network: stellar:testnet
```

The MCP server surfaces the Stellar Expert explorer link so the agent (and user) can verify the payment on-chain.

---

## Step 6 — Automatic On-Chain Attestation

After every successful 2xx response, the proxy fires a **fire-and-forget** `attest()` call to the Soroban `EndpointRegistry`:

```rust
attest(endpoint_id, payer_address, rating=5, comment="auto: paid call")
```

- The payer's real Stellar address is used for attribution.
- The attestation is permanent and publicly auditable.
- The x402 payment itself is the spam filter — fake attestations cost real USDC.

The contract emits an `("att", endpoint_id, payer)` event that any observer can index.

Human users can also submit written reviews through the marketplace UI (`POST /api/marketplace/:userSlug/:slug/attest`), which triggers the same `attest()` contract call.

---

## Step 7 — Agent-Readable Reputation

Any AI agent (or developer) can query the attestation history:

```
GET /api/attestations?endpointId=<uuid>
GET /api/attestations?userSlug=alice&slug=weather
```

Returns:

```json
{
  "endpointId": "...",
  "avgRating": 4.8,
  "ratingCount": 23,
  "attestations": [
    {
      "rating": 5,
      "comment": "auto: paid call",
      "payerAddress": "G...",
      "txHash": "a1b2c3...",
      "createdAt": "2025-04-13T10:00:00Z"
    }
  ]
}
```

An agent can use this to **automatically pick the highest-rated tool** without trusting any centralized registry — the on-chain trail is the only authority needed.

---

## Key Design Decisions

| Decision | Why |
|---|---|
| x402 over subscriptions | Zero API key management; any agent with a wallet can pay |
| Stellar testnet USDC | 5-second finality + native USDC, no bridge risk |
| Soroban for registry | Permanent, auditable anchor that outlives the StellarPay402 website |
| Auto-attestation on every paid call | Spam-resistant reputation that builds itself; no human approval needed |
| Non-blocking registry calls | Endpoint creation and payment never fail due to contract issues |
| Per-payer hourly cap | Runaway agents cannot drain wallets even if the MCP client misbehaves |

---

## Contract Reference

**EndpointRegistry** on Stellar testnet:
`CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7`

Key functions:
- `register(id, owner, pay_to, price_stroops, name)` — anchor an endpoint
- `attest(id, payer, rating, comment)` — record a reputation event
- `get(id)` — fetch endpoint record
- `count()` — total registered endpoints
