# StellarPay402 — Product Requirements Document

## Overview

StellarPay402 is an agent-to-agent (A2A) API marketplace built on the x402 protocol and Stellar testnet. It is the first marketplace where AI agents discover paid HTTP endpoints, get a working MCP tool definition, and autonomously pay per request in USDC — every transaction settling on Stellar in seconds. Endpoints are anchored on-chain via a Soroban smart contract, payments are settled by a self-hosted x402 facilitator, and a small published npm package (`@davidmaronio/stellarpay402-mcp`) lets any MCP-aware AI client (Claude Desktop, Cursor, Cline) consume the entire marketplace with a single config block and zero code.

Built for [Stellar Hacks: Agents 2026](https://dorahacks.io).

---

## Problem

The current API economy has two failure modes when agents are the consumers:

1. **Free APIs** are unsustainable, get rate-limited, and silently die.
2. **Subscription APIs** require human sign-up, credit cards, and monthly billing — autonomous agents cannot participate.

The x402 protocol solves machine-readable per-request payments, but three gaps remain in practice:

- **Discovery.** Every x402 implementation today is point-to-point — the caller has to already know the URL.
- **Integration effort.** A developer wanting to monetize an existing API must write custom middleware to verify payments, forward requests, and settle on-chain.
- **Autonomy.** AI agents cannot pay for tools they discover at runtime — someone has to hand-write wallet code, sign transactions, and handle payment headers.

---

## Solution

A multi-tenant marketplace + an installable MCP server + a Soroban registry that closes all three gaps:

1. A developer registers their HTTPS API URL and a USDC price in the dashboard.
2. The endpoint instantly appears in the public marketplace AND is anchored on-chain by emitting a `register` event on the `EndpointRegistry` Soroban contract.
3. Any MCP-aware AI assistant that has the `@davidmaronio/stellarpay402-mcp` server configured discovers the endpoint as a tool automatically.
4. When the AI calls the tool, the MCP server signs an x402 payment with its configured Stellar wallet and submits it to the proxy.
5. The proxy verifies and settles via the embedded facilitator, forwards the request to the upstream API, and returns the response to the AI alongside a Stellar Expert link to the on-chain settlement.

The whole loop runs in ~5 seconds with no human in the loop.

---

## Target users

- **API owners** monetising existing APIs per request without writing any payment integration code. They register an endpoint in the dashboard and get a paid proxy URL plus an on-chain registration on Soroban — no SDK install, no middleware.
- **Human consumers** (developers, scripts, integrators) browsing the public marketplace to discover paid APIs, with three documented integration paths on every endpoint page: raw curl, the `@x402/stellar` SDK, and the MCP server config.
- **AI agents** (Claude Desktop, Cursor, Cline, any MCP-aware client) that need to pay autonomously for tools they discover at runtime through the `@davidmaronio/stellarpay402-mcp` server — no code, no manual signing, no human in the loop.

---

## Components

### 1. Pay-per-call proxy
**Location:** `/[userSlug]/[...path]`

- Unauthenticated request → HTTP 402 + x402 v2 payment requirements (Stellar testnet, USDC)
- Request with `X-PAYMENT` header → verify with the embedded facilitator → forward to the upstream URL → return the response with `X-Payment-Receipt: <stellar tx hash>`
- Records the payment + request log in PostgreSQL.

### 2. Self-hosted x402 facilitator
**Location:** `/api/facilitator/{verify,settle,supported,health}`

Self-hosted (no third-party dependency). Built on `@x402/core` and `@x402/stellar` with `ExactStellarScheme`. Verifies the signed Soroban transaction, simulates it, settles it on testnet, and returns the resulting tx hash to the proxy.

### 3. Per-payer hourly safety cap
Enforced server-side inside the proxy after every successful verify. Queries the `payments` table for the caller's cumulative spend in the last hour and rejects the request if accepting it would exceed `MAX_PAYER_SPEND_PER_HOUR_USDC` (default `1.0`). A misbehaving client cannot bypass this.

### 4. Soroban EndpointRegistry contract
**Location:** `contracts/endpoint_registry/` (Rust)
**Deployed:** `CAUM7HCRCTSBSCPUWOZL2AOKO4YM53HJT7S4737C4U7Z6ZFVHHECMJ4I` (testnet)

Operations:
- `init(admin)` — one-time setup
- `register(id, owner, pay_to, price_stroops, name)` — emits an on-chain event; owner-authenticated
- `update(id, price_stroops, name)` — owner-only
- `attest(id, payer, score, comment)` — payer reputation attestation
- `get(id)` — read a registration
- `count()` — total endpoints anchored

Registrations are best-effort: if the on-chain call fails, the database row is still created and the dashboard surfaces a `db only` warning badge with a Re-anchor button.

### 5. Marketplace web app (Next.js 15, App Router)
- **`/`** — landing page
- **`/marketplace`** — public catalog with search, stats bar, per-endpoint cards
- **`/marketplace/[userSlug]/[slug]`** — per-endpoint detail page with three integration examples (curl, `@x402/stellar` SDK, MCP) and the on-chain payment receipts table
- **`/dashboard`** — authenticated endpoint manager with create / edit / delete / re-anchor and live counters
- **`/login`, `/register`** — better-auth (email + GitHub OAuth)

### 6. `@davidmaronio/stellarpay402-mcp` npm package
**Location:** `mcp-server/`
**Published:** https://www.npmjs.com/package/@davidmaronio/stellarpay402-mcp

A standalone MCP server that turns any running marketplace into a live tool catalog for any MCP-aware AI assistant. On startup it auto-discovers every endpoint via `/api/marketplace`, exposes each as a tool, signs x402 payments on the agent's behalf with a configured Stellar testnet secret, and enforces a client-side `MAX_USDC_PER_SESSION` budget. Tool responses include the upstream API body plus the Stellar Expert link to the settled payment.

---

## Data model

```
users
  id, name, email, slug, stellar_address, image,
  email_verified, created_at, updated_at

sessions, accounts, verifications
  (better-auth managed)

endpoints
  id, user_id, name, slug, target_url, price_usdc,
  stellar_address, active, description,
  total_requests, paid_requests, total_earned,
  on_chain_tx_hash,
  created_at, updated_at

payments
  id, endpoint_id, payer_address, amount_usdc,
  tx_hash, network, settled_at

request_logs
  id, endpoint_id, payment_id, status (paid|unpaid|error),
  response_status, latency_ms, created_at
```

---

## Routes

```
Public web
  /                              Landing page
  /marketplace                   Public catalog
  /marketplace/[user]/[slug]     Per-endpoint detail + on-chain receipts
  /login  /register              Auth

Authenticated
  /dashboard                     Endpoint manager

Public APIs (CORS-open)
  /api/marketplace                          List of all active endpoints
  /api/marketplace/[user]/[slug]/receipts   Public payment ledger for one endpoint
  /api/mcp/[user]/[slug]                    MCP tool definition + ready-to-paste config

Authenticated APIs
  /api/endpoints                 GET (list) / POST (create)
  /api/endpoints/[id]            PATCH (edit) / DELETE / POST (re-anchor)
  /api/auth/[...all]             better-auth

x402 + facilitator
  /[userSlug]/[...path]                       Pay-per-call proxy handler
  /api/facilitator/verify                     POST — verify x402 payment payload
  /api/facilitator/settle                     POST — settle a verified payment
  /api/facilitator/supported                  GET — supported networks/schemes
  /api/facilitator/health                     GET — liveness check
```

---

## x402 payment flow

```
Caller (MCP server or curl) → GET /n4buhayk/joke
  → No X-PAYMENT header
  → Server returns 402:
      {
        "x402Version": 2,
        "accepts": [{
          "scheme": "exact",
          "network": "stellar:testnet",
          "amount": "100000",
          "asset": "<USDC SAC>",
          "payTo": "GDJK43...BWXUB",
          "maxTimeoutSeconds": 300,
          "resource": "<this URL>",
          "description": "Random Joke"
        }]
      }

Caller signs an x402 payment via @x402/stellar
  → Retry with X-PAYMENT: <base64 payload>
  → Server verifies via /api/facilitator/verify
  → Per-payer hourly cap checked
  → Server settles via /api/facilitator/settle
  → Forwards request to https://official-joke-api.appspot.com/random_joke
  → Returns JSON body + X-Payment-Receipt: <stellar tx hash>
```

---

## Agent integration via MCP

```
Add to ~/Library/Application Support/Claude/claude_desktop_config.json:

{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY":   "S...",
        "MARKETPLACE_URL":      "https://stellarpay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}

Restart Claude Desktop. Every public endpoint in the marketplace
becomes a tool named {userSlug}_{endpointSlug}. Each call autopays
via x402 on Stellar testnet and returns the upstream response plus
a Stellar Expert link.
```

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack) |
| Database | PostgreSQL + Drizzle ORM (Supabase) |
| Auth | better-auth (email + GitHub OAuth) |
| Payments | x402 v2 — `@x402/core`, `@x402/stellar` |
| Smart contract | Soroban (Rust) |
| MCP runtime | `@modelcontextprotocol/sdk` |
| Styling | Tailwind CSS |
| Deployment | Vercel (web), npm registry (MCP package) |

---

## Out of scope (post-hackathon)

- Mainnet payments
- Custom domains / CNAME for proxy URLs
- Charts / time-series analytics
- Stripe / fiat on-ramp
- Team accounts and org workspaces
- Endpoint reputation aggregation in the marketplace UI (the contract supports `attest`; the UI does not yet read it)
- Generic third-party MCP client (we ship our own, `@davidmaronio/stellarpay402-mcp`)

---

## Hackathon alignment

| Judging signal | How we hit it |
| --- | --- |
| Live, reproducible end-to-end demo | Claude Desktop call → x402 settle → upstream response → Stellar Expert link, in ~5 seconds |
| Real Stellar testnet interaction | Every paid call is a real `payment` operation on testnet, visible on Stellar Expert |
| Hybrid off-chain + on-chain architecture | Heavy logic off-chain in Next.js; Soroban contract anchors every listing on-chain |
| Safety / spending caps | Server-side per-payer hourly USDC cap enforced in the proxy |
| On-chain attestations / receipts | `EndpointRegistry` `register` events + per-endpoint receipts page links every payment back to Stellar |
| Open-source repo + README | <https://github.com/davidmaronio/StellarPay402> |
| Frictionless judge experience | One MCP server entry, no clone, no install — `npx -y @davidmaronio/stellarpay402-mcp@latest` |

---

## Connection to AgentForge

AgentForge (sister hackathon submission) is an AI orchestrator that consumes paid APIs through autonomous sub-agents. StellarPay402 is the marketplace those sub-agents discover and pay through. The two together form a complete Stellar-native agent payment ecosystem: agents that *spend* (AgentForge) and agents that *earn* (StellarPay402).
