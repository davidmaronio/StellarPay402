# StellarPay402 — DoraHacks Build Description

## What I built

**StellarPay402** is a self-hosted x402 facilitator and pay-per-call API proxy, a published MCP server (`@davidmaronio/stellarpay402-mcp` on npm), a developer CLI (`stellarpay402` on npm), and a Soroban `EndpointRegistry` smart contract — all wired together into the first **agent-to-agent API marketplace on Stellar**.

Developers list any HTTP endpoint (their own API, a third-party URL, anything) through a web dashboard **or** a single terminal command:

```bash
npx stellarpay402 register --url https://myapi.com --price 0.001 --name "My API"
```

That one command registers the endpoint in the database, anchors it on the Soroban `EndpointRegistry` contract, and hands back a proxy URL — no browser, no code changes, no account creation friction beyond a first-time `npx stellarpay402 login`.

AI agents running in Claude Desktop, Cursor, or any MCP-capable client install `@davidmaronio/stellarpay402-mcp`, configure a Stellar wallet, and instantly see every public endpoint in the marketplace as a callable tool with the price already embedded. When the agent calls a tool, the MCP server:

1. Signs an x402 payment with its configured Stellar wallet
2. Sends the payment to the StellarPay402 proxy
3. The proxy settles USDC on Stellar testnet in ~5 seconds
4. Returns the upstream API response alongside a Stellar Expert transaction link
5. Automatically anchors a 5-star on-chain attestation on the `EndpointRegistry` contract, tied to the paying wallet

---

## What makes it different

Every other x402 project puts the AI on the **buying** side. StellarPay402 puts it on **both** sides.

The marketplace includes a built-in **AI Answer Agent** endpoint — a Claude Haiku-powered API listed in the public catalog with an "AI Agent" badge. Claude Desktop discovers it via MCP, pays **\$0.01 USDC on Stellar**, and receives an AI-generated answer. Agent buys from agent, fully on-chain, zero humans in the loop.

### On-chain reputation (not just payments)

After every successful paid call, the proxy automatically fires `attest()` on the Soroban `EndpointRegistry` — a 5-star attestation linked to the real payer wallet. No human approval. No platform trust required. The x402 payment itself is the spam filter.

Callers can also leave a written review through the marketplace UI. That too calls `attest()` on-chain — same contract, same permanent trail. AI agents can read the attestation history to pick the highest-rated tool without trusting any centralized registry.

### Per-payer spending cap

The MCP server enforces a configurable `MAX_USDC_PER_SESSION` budget. Runaway agents cannot drain the wallet.

### Developer experience

| Path | Steps |
|---|---|
| Dashboard | Sign in → paste URL → set price → click Create |
| CLI | `npx stellarpay402 login` once, then `npx stellarpay402 register --url ... --price ...` |

Both paths emit the same Soroban `register` event. The on-chain trail exists even if the StellarPay402 website goes down.

---

## Architecture

```
Developer
  │
  ├─ Dashboard (Next.js)  ◄──►  CLI (npx stellarpay402)
  │         │                         │
  │    API Key auth              API Key auth
  │         │                         │
  └─────────┴──────► /api/v1/register
                            │
                     Soroban EndpointRegistry
                     CCCCETOW…XZYA7 (testnet)
                            │
                     StellarPay402 Proxy
                            │
              ┌─────────────┴─────────────┐
              │                           │
       x402 payment                Upstream API
       (USDC / Stellar)           response returned
              │
       Stellar Expert tx link
              │
       attest() → EndpointRegistry
       (on-chain reputation, auto)
              │
       MCP Server (@davidmaronio/stellarpay402-mcp)
              │
       Claude Desktop / Cursor / Cline
```

---

## Live links

| Resource | Link |
|---|---|
| Live demo | https://stellar-pay402.vercel.app |
| GitHub repo | https://github.com/davidmaronio/StellarPay402 |
| MCP server (npm) | https://www.npmjs.com/package/@davidmaronio/stellarpay402-mcp |
| CLI (npm) | https://www.npmjs.com/package/stellarpay402 |
| Soroban contract (testnet) | `CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7` |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 15, Tailwind CSS, shadcn/ui |
| Database | Neon Postgres + Drizzle ORM |
| Payments | x402 protocol v2, USDC on Stellar testnet |
| Smart contract | Soroban (Rust), `EndpointRegistry` |
| MCP server | `@modelcontextprotocol/sdk`, published on npm |
| CLI | Pure ESM Node.js, published on npm as `stellarpay402` |
| AI agent endpoint | Claude Haiku via Anthropic API |
| Deployment | Vercel (frontend + API), Stellar testnet |

---

## How to run it yourself

### 1 — Try the AI Answer Agent (no setup)

Open Claude Desktop. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY": "S...your testnet secret...",
        "MARKETPLACE_URL": "https://stellar-pay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}
```

Restart Claude Desktop. Ask:

```
Use stellarpay402 to ask the AI Answer Agent: what is x402 and why does it matter for AI agents?
```

Claude pays another AI \$0.01 USDC on Stellar and returns the answer with a Stellar Expert link.

### 2 — Register your own API via CLI

```bash
# One-time login (get your API key from stellar-pay402.vercel.app/dashboard)
npx stellarpay402 login

# Register any HTTP endpoint
npx stellarpay402 register \
  --url https://catfact.ninja/fact \
  --price 0.01 \
  --name "Cat Facts"
```

The CLI prints your proxy URL and Stellar Expert link for the on-chain registration. Your endpoint appears in the marketplace instantly and is callable from Claude Desktop without any restart.

### 3 — Self-host

```bash
git clone https://github.com/davidmaronio/StellarPay402
cd StellarPay402
cp .env.example .env.local   # fill in Neon DB, Stellar keys, Anthropic key
npm install
npm run dev
```

---

## Why Stellar

- **5-second finality** — fast enough for synchronous AI agent calls
- **USDC native** — no wrapping, no bridge risk
- **Soroban** — smart contract layer for on-chain endpoint registry and attestations
- **Low fees** — \$0.001 per Stellar operation makes micropayments viable at AI agent call volume

---

## Roadmap (post-hackathon)

- Mainnet USDC support
- Per-caller rate limiting and allowlists
- Agent-readable attestation API so AI agents can automatically pick the best-rated tool
- Webhook on payment received for endpoint owners
- Multi-currency pricing (XLM, other Stellar assets)
