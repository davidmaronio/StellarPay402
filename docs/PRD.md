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

The flow:

1. A developer registers an HTTPS API URL and a USDC price in the dashboard.
2. The endpoint shows up in the public marketplace right away. The app also emits a `register` event on the `EndpointRegistry` Soroban contract, which anchors the listing on chain.
3. Any MCP client that has `@davidmaronio/stellarpay402-mcp` configured discovers the endpoint as a tool automatically.
4. When the AI calls the tool, the MCP server signs an x402 payment with its configured Stellar wallet and submits it to the proxy.
5. The proxy verifies and settles the payment through the embedded facilitator. It forwards the request to the upstream API and returns the response to the AI with a Stellar Expert link to the on chain settlement.

The whole loop runs in about 5 seconds with no human in the loop.

## Target users

- **API owners** who want to monetize an existing API per request without writing payment integration code. You register an endpoint in the dashboard. You get a paid proxy URL plus an on chain registration on Soroban. No SDK install. No middleware.
- **Human consumers** (developers, scripts, integrators) browsing the public marketplace to find paid APIs. Every endpoint page shows three integration paths you can copy and paste: raw curl, the `@x402/stellar` SDK, and the MCP server config.
- **AI agents** (Claude Desktop, Cursor, Cline, any MCP client) that need to pay for tools they discover at runtime. The agent does this through `@davidmaronio/stellarpay402-mcp`. No code, no manual signing, no human in the loop.

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
**Deployed:** `CAUM7HCRCTSBSCPUWOZL2AOKO4YM53HJT7S4737C4U7Z6ZFVHHECMJ4I` (testnet)

Operations:

- `init(admin)`. One time setup.
- `register(id, owner, pay_to, price_stroops, name)`. Emits an on chain event. Owner authenticated.
- `update(id, price_stroops, name)`. Owner only.
- `attest(id, payer, score, comment)`. Anyone can leave a payer reputation note.
- `get(id)`. Read a registration.
- `count()`. Total endpoints anchored.

Registrations are best effort. If the on chain call fails, the database row is still created. The dashboard shows a `db only` warning badge with a Re-anchor button.

### 5. Marketplace web app (Next.js 15, App Router)

- `/`. Landing page.
- `/marketplace`. Public catalog with search, stats bar, per endpoint cards.
- `/marketplace/[userSlug]/[slug]`. Per endpoint detail page with three integration examples (curl, `@x402/stellar` SDK, MCP) and the on chain payment receipts table.
- `/dashboard`. Authenticated endpoint manager with create, edit, delete, re anchor, and live counters.
- `/login`, `/register`. better-auth (email and GitHub OAuth).

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
  created_at, updated_at

payments
  id, endpoint_id, payer_address, amount_usdc,
  tx_hash, network, settled_at

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
  /api/marketplace                          List of all active endpoints
  /api/marketplace/[user]/[slug]/receipts   Public payment ledger for one endpoint
  /api/mcp/[user]/[slug]                    MCP tool definition + ready-to-paste config

Authenticated APIs
  /api/endpoints                 GET (list) / POST (create)
  /api/endpoints/[id]            PATCH (edit) / DELETE / POST (re-anchor)
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
        "MARKETPLACE_URL":      "https://stellarpay402.vercel.app",
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
| Smart contract | Soroban (Rust) |
| MCP runtime | `@modelcontextprotocol/sdk` |
| Styling | Tailwind CSS |
| Deployment | Vercel for the web app, npm registry for the MCP package |

## Out of scope (post hackathon)

- Mainnet payments
- Custom domains / CNAME for proxy URLs
- Charts and time series analytics
- Stripe and fiat on ramp
- Team accounts and org workspaces
- Endpoint reputation aggregation in the marketplace UI. The contract supports `attest`. The UI does not yet read it.
- A generic third party MCP client. I ship my own as `@davidmaronio/stellarpay402-mcp`.

## Hackathon alignment

| Judging signal | How I hit it |
| --- | --- |
| Live, reproducible end-to-end demo | Claude Desktop call, x402 settle, upstream response, Stellar Expert link. About 5 seconds. |
| Real Stellar testnet interaction | Every paid call is a real `payment` operation on testnet, visible on Stellar Expert. |
| Hybrid off-chain + on-chain architecture | Heavy logic off chain in Next.js. Soroban contract anchors every listing on chain. |
| Safety / spending caps | Server side per-payer hourly USDC cap enforced in the proxy. |
| On-chain attestations / receipts | `EndpointRegistry` `register` events plus the per-endpoint receipts page link every payment back to Stellar. |
| Open-source repo and README | <https://github.com/davidmaronio/StellarPay402> |
| Frictionless judge experience | One MCP server entry. No clone. No install. `npx -y @davidmaronio/stellarpay402-mcp@latest`. |
