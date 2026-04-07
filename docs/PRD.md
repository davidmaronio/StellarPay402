# StellarPay402 — Product Requirements Document

## Overview

StellarPay402 is a self-serve API monetization platform built on the x402 protocol and Stellar testnet. Any developer can point it at their existing API, set a USDC price per request, and instantly get a paid proxy URL — no code changes required on their end. Callers without payment get a 402 response with a Stellar-native paywall. Callers with a valid x402 payment header get their request forwarded and the response returned.

---

## Problem

APIs are either free (unsustainable) or hidden behind subscriptions (inaccessible). There is no lightweight way to charge per-request in a machine-readable, crypto-native way. Agents especially hit this wall — they can reason and act, but they can't pay. x402 on Stellar solves this, but developers have no easy tool to add it to their existing APIs without writing custom middleware.

---

## Solution

A proxy platform where:
1. Developer registers their private API URL + sets a price in USDC
2. They get a public proxy URL (e.g. `stellarpay402.app/username/endpoint`)
3. Any caller — human, agent, or script — hits that URL
4. No payment header → 402 + Stellar paywall page
5. Valid x402 payment → request forwarded, response returned, USDC settled on Stellar testnet

---

## Target Users

- **API developers** who want to monetize their data/tools per-request
- **AI agents** (like AgentForge) that need to autonomously pay for API access
- **Hackathon judges** evaluating Stellar payment infrastructure

---

## Core Features (MVP — must ship by April 13)

### 1. Proxy Engine
- `GET/POST /{username}/{slug}[/...path]` — main proxy handler
- Reads `X-PAYMENT` header, verifies via Stellar x402 facilitator
- On valid payment: forwards request to target URL, returns response
- On missing/invalid payment: returns HTTP 402 + JSON payment requirements + HTML paywall

### 2. Dashboard (authenticated)
- Register/login (email or GitHub OAuth)
- Create endpoint: target URL, price (USDC), Stellar wallet address to receive payment
- List endpoints with live request + revenue counters
- Copy proxy URL with one click

### 3. Stellar x402 Payment Layer
- Uses `@x402/stellar` SDK (or Stellar-compatible x402 facilitator)
- Network: Stellar testnet (USDC/AQUA testnet asset)
- Payment verification + settlement on every proxied request
- Receipt hash stored in DB for auditability

### 4. Paywall Page
- Clean HTML page served on 402 response
- Shows: resource name, price, Stellar wallet QR / WalletConnect
- Auto-retries request after payment detected

### 5. Analytics
- Per-endpoint: total requests, paid requests, revenue earned
- Simple table — no charts needed for MVP

---

## Out of Scope (not in MVP)

- Mainnet payments
- Custom domains / CNAME
- Rate limiting per payer address
- TimescaleDB / large-scale analytics
- Stripe / fiat on-ramp
- Team accounts / API keys

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL + Drizzle ORM (Neon free tier) |
| Auth | better-auth (email + GitHub) |
| Payments | x402 protocol on Stellar testnet |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel (frontend + API routes) |
| Package manager | npm |

---

## Data Model

```
users
  id, email, slug, stellar_address, created_at

endpoints
  id, user_id, name, slug, target_url, price_usdc,
  stellar_address, active, created_at

payments
  id, endpoint_id, payer_address, amount_usdc,
  tx_hash, settled_at

request_logs
  id, endpoint_id, payment_id, status (paid|unpaid|error),
  response_status, latency_ms, created_at
```

---

## Routes

```
/                          Landing page
/login                     Auth
/register                  Auth
/dashboard                 Endpoint list
/dashboard/endpoints/new   Create endpoint
/dashboard/endpoints/[id]  Edit + analytics

/[userSlug]/[...path]      Proxy handler (the core)
/api/auth/[...all]         better-auth
/api/endpoints             CRUD
```

---

## x402 Flow (Stellar)

```
Client → GET /alice/weather-api
  → No X-PAYMENT header
  → Server returns 402:
      {
        "x402Version": 1,
        "accepts": [{
          "scheme": "exact",
          "network": "stellar:testnet",
          "amount": "0.01",
          "asset": "USDC",
          "payTo": "GALICE...STELLAR_ADDRESS"
        }]
      }

Client pays on Stellar testnet
  → Retry with X-PAYMENT: <base64 signed payment>
  → Server verifies with x402 Stellar facilitator
  → Forwards to https://api.alice.com/weather
  → Returns response + X-Payment-Receipt header
```

---

## Hackathon Alignment

| Requirement | How we meet it |
|---|---|
| Open-source repo + README | GitHub public repo |
| Video demo (2-3 min) | Show: create endpoint → call without payment (402) → call with payment (200) → dashboard shows revenue |
| Real Stellar testnet interaction | Every proxied paid request = real Stellar testnet tx |
| Hackathon theme | "APIs that monetize every useful call" — exact quote from brief |

---

## Build Order (6 days)

| Day | Task |
|---|---|
| Day 1 | Project scaffold, DB schema, auth, basic dashboard UI |
| Day 2 | Proxy handler core — 402 response + forward on payment |
| Day 3 | Stellar x402 integration — verify + settle payments |
| Day 4 | Paywall page + analytics dashboard |
| Day 5 | Deploy to Vercel + Neon, end-to-end test |
| Day 6 | README, demo video, DoraHacks submission |

---

## Connection to AgentForge

StellarPay402 and AgentForge tell a complete story together:

- **AgentForge** = AI agents that *consume* paid APIs autonomously
- **StellarPay402** = the infrastructure that lets anyone *create* paid APIs on Stellar

AgentForge agents could point directly at StellarPay402 proxy URLs as their data sources. Two submissions, one ecosystem.
