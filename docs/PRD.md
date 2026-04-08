# StellarPay402 — Product Requirements Document

## Overview

StellarPay402 is an **agent-to-agent (A2A) API marketplace** built on the x402 protocol and Stellar testnet. It is the first marketplace where AI agents can discover paid API endpoints, get MCP-compatible tool definitions, and autonomously pay per request in USDC — with every transaction settling on Stellar in seconds.

Developers list their APIs. Agents find and call them. Payments happen automatically. No subscriptions, no API keys, just HTTP + x402.

---

## Problem

The current API economy has two failure modes:
1. **Free APIs** are unsustainable and get rate-limited or killed.
2. **Subscription APIs** require human sign-up, credit cards, and monthly billing — AI agents cannot participate.

The x402 protocol solves machine-readable payments, but there's no **marketplace** where agents can *discover* what's available and get a ready-made tool definition to plug in. Every x402 implementation today is point-to-point — you have to already know the URL.

---

## Solution

A multi-tenant marketplace where:
1. Developer registers their private API URL + sets a price in USDC
2. Endpoint appears in the **public marketplace** with pricing and MCP config
3. Any agent — Claude, GPT, custom — browses the marketplace and copies a one-click MCP config
4. Agent calls the proxy URL with an x402 Stellar payment header
5. Payment verified → request forwarded → response returned → USDC settled on Stellar testnet

---

## What Makes This Different From Other x402 Projects

| Feature | AgentPay-x402 / AgenFlare | StellarPay402 |
|---|---|---|
| Scope | Single developer's proxy | Multi-tenant marketplace |
| Discovery | None (point-to-point) | Public marketplace with search |
| Agent integration | Copy URL manually | One-click MCP tool config |
| Audience | Developers | Both developers AND agents |
| Network effect | None | Each new listing adds value for all agents |

---

## Target Users

- **API developers** — monetize existing APIs with zero code changes
- **AI agents** — discover and autonomously pay for data/compute services
- **Hackathon judges** — evaluate a complete A2A payment ecosystem on Stellar

---

## Core Features (MVP — ship by April 13)

### 1. Public Marketplace (`/marketplace`)
- Lists all active endpoints across all registered developers
- Shows: name, description, owner, price per request, paid call count
- Search/filter by name or description
- "Copy MCP config" — one click copies ready-to-use MCP server config JSON
- "Copy proxy URL" for direct HTTP use

### 2. MCP Tool Definition API (`/api/mcp/[userSlug]/[slug]`)
- Returns structured JSON per endpoint:
  - MCP server config (for claude_desktop_config.json)
  - OpenAI function definition (for any agent SDK)
  - x402 payment metadata (proxyUrl, priceUsdc, network, payTo)
- CORS-open, cacheable, no auth required

### 3. x402 Proxy Engine (`/[userSlug]/[...path]`)
- No `X-PAYMENT` header → HTTP 402 + Stellar payment requirements JSON
- Valid payment header → verify with x402 Stellar facilitator → forward to target → return response
- Records tx hash as `X-Payment-Receipt` in response headers
- Stores payment + request log in DB

### 4. Developer Dashboard (authenticated)
- Register/login via email or GitHub OAuth
- Create endpoint: name, slug, target URL, price (USDC), Stellar wallet address
- List endpoints with live request + revenue counters
- Per-endpoint: copy proxy URL, copy MCP config, view paid request count + earned USDC

### 5. Analytics
- Per-endpoint: total requests, paid requests, revenue earned (USDC)
- Global stats on marketplace page: total endpoints, total paid calls, total USDC settled

---

## Out of Scope (not in MVP)

- Mainnet payments
- Custom domains / CNAME
- Rate limiting per payer address
- Charts / time-series analytics
- Stripe / fiat on-ramp
- Team accounts / org workspaces
- Actual x402-mcp-client npm package (stub config for demo)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Drizzle ORM (Supabase) |
| Auth | better-auth (email + GitHub OAuth) |
| Payments | x402 protocol on Stellar testnet |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Data Model

```
users
  id, email, name, slug, stellar_address, created_at

endpoints
  id, user_id, name, slug, target_url, price_usdc,
  stellar_address, active, description,
  total_requests, paid_requests, total_earned, created_at

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
/                              Landing page (A2A marketplace pitch)
/marketplace                   Public endpoint marketplace
/login                         Sign in
/register                      Create account
/dashboard                     Endpoint management
/dashboard/endpoints/new       List a new API

/[userSlug]/[...path]          x402 proxy handler
/api/marketplace               Public list of all active endpoints
/api/mcp/[userSlug]/[slug]     MCP tool definition JSON (CORS-open)
/api/endpoints                 CRUD (authenticated)
/api/auth/[...all]             better-auth
```

---

## x402 Flow

```
Agent → GET /alice/weather-api
  → No X-PAYMENT header
  → Server returns 402:
      {
        "x402Version": 1,
        "accepts": [{
          "scheme": "exact",
          "network": "stellar:testnet",
          "amount": "0.0100000",
          "asset": "USDC",
          "payTo": "GALICE...STELLAR_ADDRESS"
        }]
      }

Agent pays on Stellar testnet → signs transaction
  → Retry with X-PAYMENT: <base64 signed payment>
  → Server verifies with x402 Stellar facilitator
  → Forwards to https://api.alice.com/weather
  → Returns response + X-Payment-Receipt: <tx_hash>
```

---

## MCP Integration Flow

```
Agent → GET /api/mcp/alice/weather
  → Returns:
      {
        "name": "alice_weather",
        "description": "Real-time weather — $0.01 USDC/request",
        "mcpServerConfig": {
          "weather-api": {
            "command": "npx",
            "args": ["-y", "x402-mcp-client", "https://stellarpay402.app/alice/weather"],
            "env": { "STELLAR_SECRET_KEY": "S..." }
          }
        }
      }

Agent adds config to claude_desktop_config.json
  → Tool appears in Claude's toolbox
  → Every call auto-pays via x402 on Stellar
```

---

## Hackathon Alignment

| Requirement | How we meet it |
|---|---|
| End-to-end agent demo | Register → List → Browse marketplace → Copy MCP → Call → Pay → Revenue |
| Real Stellar testnet | Every paid request = real Stellar testnet USDC tx with receipt hash |
| A2A payments (winning pattern) | Marketplace + MCP config = true agent-to-agent discovery and payment |
| On-chain evidence | tx_hash stored + returned in X-Payment-Receipt header |
| Differentiator | Only multi-tenant marketplace with MCP tool definitions per endpoint |

---

## Build Order

| Day | Task |
|---|---|
| Day 1 | Scaffold, DB schema, auth, basic dashboard |
| Day 2 | Proxy handler — 402 response + forwarding |
| Day 3 | Marketplace page + MCP tool definition API |
| Day 4 | Stellar x402 integration — verify + settle |
| Day 5 | Deploy Vercel + Supabase, E2E test |
| Day 6 | README, demo video, DoraHacks submission |

---

## Connection to AgentForge

- **AgentForge** = AI orchestrator that *consumes* paid APIs via autonomous agents
- **StellarPay402** = the marketplace where anyone *lists* paid APIs for agents to discover and pay for

AgentForge agents use StellarPay402 proxy URLs as their data sources. Two submissions, one complete Stellar agent ecosystem.
