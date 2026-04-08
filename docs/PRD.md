# StellarPay402 Product Requirements Document

## Overview

StellarPay402 is an agent to agent API marketplace built on the x402 protocol and Stellar testnet. AI agents discover paid HTTP endpoints, get a working MCP tool definition, and pay per request in USDC on their own. Every transaction settles on Stellar in seconds. Endpoints are anchored on chain by a Soroban smart contract. Payments are settled by a self hosted x402 facilitator. A small published npm package called `@davidmaronio/stellarpay402-mcp` lets any MCP client (Claude Desktop, Cursor, Cline) consume the marketplace with one config block and zero code.

I built this for [Stellar Hacks: Agents 2026](https://dorahacks.io).

## Problem

The current API economy has two failure modes when agents are the consumers.

1. **Free APIs.** They are unsustainable, get rate limited, and silently die.
2. **Subscription APIs.** They need a human signup, a credit card, and monthly billing. Agents cannot use them.

The x402 protocol solves machine readable per request payments. Three gaps still remain.

- **Discovery.** Every x402 implementation today is point to point. The caller has to already know the URL.
- **Integration effort.** A developer who wants to monetize an existing API must write custom middleware to verify payments, forward requests, and settle on chain.
- **Autonomy.** AI agents cannot pay for tools they discover at runtime. Someone has to write the wallet code, sign transactions, and add the payment headers by hand.

## Solution

StellarPay402 is one app that closes all three gaps. It has a multi tenant marketplace, a self hosted x402 facilitator, an installable MCP server, and a Soroban registry contract.

The A2A flow:

1. A developer (or AI agent) registers an HTTPS API URL and a USDC price. Mark it "AI-powered" if it is backed by a model. A `register` event is emitted on the Soroban `EndpointRegistry` — the listing is anchored on chain immediately.
2. The endpoint appears in the public marketplace with an "AI Agent" badge and "on-chain" badge visible on the card.
3. Any MCP client with `@davidmaronio/stellarpay402-mcp` discovers the endpoint as a callable tool automatically — no code, no restart required.
4. The buyer AI calls the tool. The MCP server signs an x402 payment with its Stellar wallet and submits to the proxy.
5. The proxy verifies + settles via the embedded facilitator. USDC moves on Stellar testnet. The proxy forwards to the target URL (which may itself be an AI agent) and returns the response with a Stellar Expert receipt link.
6. After the paid call, the caller submits a 1–5 star attestation. The rating is saved to the DB and an `attest()` tx is submitted to the Soroban contract — permanently anchoring the caller's real Stellar address and score on chain.

The full loop runs in about 5–7 seconds with no human in the loop at any step.

## Target users

- **API owners (seller agents)** who want to monetize an existing API per request without writing payment integration code. Mark it "AI-powered" if the endpoint is backed by a model. You get a paid proxy URL plus an on-chain registration on Soroban, plus automatic reputation via attestations.
- **Human consumers** (developers, scripts, integrators) browsing the public marketplace to find paid APIs. Every endpoint page shows three integration paths: raw curl, the `@x402/stellar` SDK, and the MCP config block.
- **AI agents (buyer agents)** (Claude Desktop, Cursor, Cline, any MCP client) that need to pay for tools they discover at runtime. The agent uses `@davidmaronio/stellarpay402-mcp` — no code, no manual signing, no human in the loop.

## Components

### 1. Pay per call proxy

**Location:** `/[userSlug]/[...path]`

- Unauthenticated request: returns HTTP 402 with x402 v2 payment requirements (Stellar testnet, USDC).
- Request with `X-PAYMENT` header: verifies with the embedded facilitator, forwards to the upstream URL, returns the response with `X-Payment-Receipt: <stellar tx hash>`.
- Records the payment and the request log in PostgreSQL.

### 2. Self hosted x402 facilitator

**Location:** `/api/facilitator/{verify,settle,supported,health}`

Self hosted. No third party dependency. Built on `@x402/core` and `@x402/stellar` with `ExactStellarScheme`. Verifies the signed Soroban transaction, simulates it, settles it on testnet, and returns the resulting tx hash to the proxy.

### 3. Per payer hourly safety cap

Enforced server side inside the proxy after every successful verify. Queries the `payments` table for the caller's cumulative spend in the last hour. Rejects the request if accepting it would exceed `MAX_PAYER_SPEND_PER_HOUR_USDC` (default `1.0`). A misbehaving client cannot bypass this.

### 4. Soroban EndpointRegistry contract

**Location:** `contracts/endpoint_registry/` (Rust)
**Deployed:** `CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7` (testnet)

Operations:

- `init(admin)`. One time setup.
- `register(id, owner, pay_to, price_stroops, name)`. Emits an on chain event. Owner authenticated.
- `update(id, price_stroops, name)`. Owner only.
- `attest(id, payer, rating, comment)`. Open — no auth required. Rating 1..=5. The economic cost of the preceding x402 payment is the spam filter. Passes the caller's real Stellar G-address for on-chain attribution.
- `get(id)`. Read a registration.
- `count()`. Total endpoints anchored.

Registrations are best effort. If the on chain call fails, the database row is still created. The dashboard shows a `db only` warning badge with a Re-anchor button.

### 5. Marketplace web app (Next.js 15, App Router)

- `/`. Landing page — A2A hero, 6-step orbital animation (list → anchor → discover → pay → settle → attest).
- `/marketplace`. Public catalog — "AI Agent" badge, "on-chain" badge, inline ★ rating on every card.
- `/marketplace/[userSlug]/[slug]`. Endpoint detail — 4 stat cards (requests, paid, earned, avg rating), receipts table, attestation list with Stellar Expert links, star rating form.
- `/dashboard`. Authenticated endpoint manager — create, edit, delete, re-anchor, "AI Agent" badge, live counters.
- `/login`, `/register`. better-auth (email + GitHub OAuth).

### 6. AI demo endpoint — built-in seller agent

**Location:** `/api/demo/ai-answer`

Answers any natural language question. Backed by `claude-haiku-4-5-20251001` (Anthropic API) if `ANTHROPIC_API_KEY` is set; falls back to a smart mock. Register it in the dashboard with "AI-powered" checked and a USDC price — it becomes the seller agent in the A2A demo.

Response shape:
```json
{
  "question": "...",
  "answer": "...",
  "model": "claude-haiku-4-5-20251001",
  "latencyMs": 1700,
  "paidVia": "x402 · Stellar testnet · USDC",
  "poweredBy": "StellarPay402 agent-to-agent marketplace"
}
```

### 7. On-chain attestation system

**API:** `POST /api/marketplace/[user]/[slug]/attest`
**Client component:** `src/components/ui/attest-form.tsx`
**Soroban bridge:** `attestEndpointOnChain()` in `src/lib/registry.ts`

Flow:
1. Caller submits `{ rating, comment, payerAddress }` to the API route
2. Rating saved to `attestations` table in PostgreSQL
3. `attest()` called on Soroban contract — emits permanent `("att", endpoint_id, payer)` event
4. Stellar Expert link returned to UI
5. Avg rating updated on marketplace cards + endpoint stat card

### 6. `@davidmaronio/stellarpay402-mcp` npm package

**Location:** `mcp-server/`
**Published:** https://www.npmjs.com/package/@davidmaronio/stellarpay402-mcp

A standalone MCP server. Turns any running marketplace into a live tool catalog for any MCP client. On startup, it auto discovers every endpoint via `/api/marketplace`, exposes each as a tool, signs x402 payments on the agent's behalf with a configured Stellar testnet secret, and enforces a client side `MAX_USDC_PER_SESSION` budget. Tool responses include the upstream API body plus the Stellar Expert link to the settled payment.

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
  is_ai_powered,             ← AI Agent badge in marketplace
  created_at, updated_at

payments
  id, endpoint_id, payer_address, amount_usdc,
  tx_hash, network, settled_at

attestations
  id, endpoint_id, payer_address, rating (1–5),
  comment, tx_hash (Soroban attest() tx),
  created_at

request_logs
  id, endpoint_id, payment_id, status (paid|unpaid|error),
  response_status, latency_ms, created_at
```

## Routes

```
Public web
  /                              Landing page
  /marketplace                   Public catalog
  /marketplace/[user]/[slug]     Per-endpoint detail + on-chain receipts
  /login  /register              Auth

Authenticated
  /dashboard                     Endpoint manager

Public APIs (CORS open)
  /api/marketplace                               List of all active endpoints (includes avgRating, ratingCount, isAiPowered)
  /api/marketplace/[user]/[slug]/receipts        Public payment ledger for one endpoint
  /api/marketplace/[user]/[slug]/attest          POST — submit star attestation (saves to DB + calls Soroban attest())
  /api/mcp/[user]/[slug]                         MCP tool definition + ready-to-paste config
  /api/demo/ai-answer                            GET/POST — Claude Haiku Q&A (the built-in seller agent)

Authenticated APIs
  /api/endpoints                 GET (list) / POST (create, includes isAiPowered)
  /api/endpoints/[id]            PATCH (edit, includes isAiPowered) / DELETE / POST (re-anchor)
  /api/auth/[...all]             better-auth

x402 + facilitator
  /[userSlug]/[...path]                       Pay-per-call proxy handler
  /api/facilitator/verify                     POST. Verify x402 payment payload.
  /api/facilitator/settle                     POST. Settle a verified payment.
  /api/facilitator/supported                  GET. Supported networks and schemes.
  /api/facilitator/health                     GET. Liveness check.
```

## x402 payment flow

```
Caller (MCP server or curl) -> GET /n4buhayk/joke
  No X-PAYMENT header
  Server returns 402:
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
  Retry with X-PAYMENT: <base64 payload>
  Server verifies via /api/facilitator/verify
  Per-payer hourly cap checked
  Server settles via /api/facilitator/settle
  Forwards request to https://official-joke-api.appspot.com/random_joke
  Returns JSON body + X-Payment-Receipt: <stellar tx hash>
```

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
        "MARKETPLACE_URL":      "https://stellar-pay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}

Restart Claude Desktop. Every public endpoint in the marketplace
shows up as a tool named {userSlug}_{endpointSlug}. Each call
auto pays via x402 on Stellar testnet and returns the upstream
response plus a Stellar Expert link.
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack) |
| Database | PostgreSQL + Drizzle ORM (Supabase) |
| Auth | better-auth (email + GitHub OAuth) |
| Payments | x402 v2 (`@x402/core`, `@x402/stellar`) |
| AI (demo endpoint) | Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic API |
| Smart contract | Soroban (Rust, `soroban-sdk` v21) |
| MCP runtime | `@modelcontextprotocol/sdk` |
| Styling | Tailwind CSS |
| Deployment | Vercel (app) · Supabase (database) · npm (MCP package) |

## Out of scope (post hackathon)

- Mainnet payments
- Custom domains / CNAME for proxy URLs
- Charts and time series analytics
- Stripe and fiat on ramp
- Team accounts and org workspaces
- A generic third party MCP client. I ship my own as `@davidmaronio/stellarpay402-mcp`.

## Hackathon alignment

| Judging signal | How I hit it |
| --- | --- |
| Live, reproducible E2E demo | Claude Desktop → MCP → x402 → Stellar settlement → response → Stellar Expert link. ~5 seconds. |
| Agent-to-agent (unique angle) | Built-in AI Answer Agent (Claude Haiku) listed as a paid endpoint. Buyer agent pays seller agent on Stellar with zero humans. |
| Real Stellar testnet interaction | Every paid call is a real USDC `payment` op on testnet, publicly visible on Stellar Expert. |
| Hybrid off-chain + on-chain | Heavy logic off-chain in Next.js. Soroban contract anchors listings (`register`) and reputation (`attest`). |
| On-chain attestations (reputation) | `attest()` called after every rated call — emits permanent event with caller's real Stellar address, rating, and comment. Star ratings shown on marketplace cards and endpoint pages. |
| Safety / spending caps | Server-side per-payer hourly USDC cap enforced in the proxy. Agents cannot drain a wallet. |
| Open-source repo | <https://github.com/davidmaronio/StellarPay402> |
| Frictionless judge experience | `npx -y @davidmaronio/stellarpay402-mcp@latest`. No clone, no install, no code. |
