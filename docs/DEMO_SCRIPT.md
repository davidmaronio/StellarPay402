# StellarPay402 Demo Video Script

**Length:** 2:30, hard cap at 3:00.
**Goal:** by 30 seconds the judge thinks "I have not seen this before".
**The headline:** two AI agents transacting with each other on Stellar — one sells, one pays, zero humans.
**Recording:** 1080p, narration over screen capture, no music.

---

## Pre-flight checklist

Do all of these BEFORE you hit record. Do NOT record this part.

### 1. Register the AI demo endpoint (do this once, before recording)

Go to <https://stellar-pay402.vercel.app/dashboard> → "New endpoint".

Fill in:
- **Name:** AI Answer Agent
- **Slug:** ai-agent
- **Target URL:** `https://stellar-pay402.vercel.app/api/demo/ai-answer`
- **Price:** 0.01
- **Stellar address:** your testnet wallet
- ✅ Check "AI-powered endpoint"

Click Create. You should see the purple "AI Agent" badge and green "on-chain" badge appear. This is the seller agent.

### 2. Claude Desktop MCP config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY":   "S...your testnet secret...",
        "MARKETPLACE_URL":      "https://stellar-pay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}
```

### 3. Wallet funded

The wallet behind `STELLAR_SECRET_KEY` has at least 0.20 USDC on Stellar testnet (covers ~20 paid calls).

### 4. Warm-up run (do not record)

In Claude Desktop, fresh chat:

```
What stellarpay402 tools do you have?
```

Confirm Claude lists your endpoints including `n4buhayk_ai-agent`. Do not record this.

### 5. Pre-load browser tabs in this order

- **Tab 1:** <https://stellar-pay402.vercel.app/marketplace> (the public catalog)
- **Tab 2:** <https://stellar-pay402.vercel.app/marketplace/n4buhayk/ai-agent> (AI agent receipts + ratings)
- **Tab 3:** <https://stellar-pay402.vercel.app/dashboard>

### 6. Confirm new contract is live

```bash
stellar contract invoke \
  --id CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7 \
  --source stellarpay402 --network testnet -- count
```

Should print `>= 3` (your registered endpoints).

### 7. Security check

Close any terminal showing an `S...` secret key. Close `.env.local`. Close password managers.

---

## Opening hook (0:00 – 0:20)

Show: Claude Desktop, fresh chat window, nothing typed yet. Show Tab 1 (marketplace) briefly with the "AI Agent" badge visible.

> "Every x402 project puts the AI on the buying side. StellarPay402 puts it on both sides. One AI agent sells its output. Another AI agent discovers it, pays on Stellar, and gets the answer. Zero humans, zero code, zero approval. Watch."

---

## Segment 1 — agent buys from agent (0:20 – 1:15)

Switch to Claude Desktop. Type:

```
Use stellarpay402 to ask the AI Answer Agent: what is x402 and why does it matter for AI agents?
```

Claude responds. The tool call expands. The response contains:
- A real AI-generated answer (not just static data)
- `Paid: 0.0100 USDC on Stellar testnet`
- A `https://stellar.expert/explorer/testnet/tx/...` link
- Session budget: `0.0100 / 0.5000 USDC`

Narrate:

> "Claude just paid another AI agent $0.01 to answer a question. The buyer is Claude Desktop. The seller is an AI-powered endpoint running on StellarPay402. The payment settled on Stellar testnet in five seconds. I did not touch a button."

Click the Stellar Expert link. Show the real settlement transaction.

> "Real USDC. Real on-chain proof. That is not a mock."

Switch to Tab 2 (the AI agent's receipts page). Refresh. The new payment row appears at the top.

> "The payment shows up here publicly. Every call, every payer address, every tx hash — independently verifiable on Stellar Explorer."

---

## Segment 2 — on-chain reputation (1:15 – 1:35)

Still on Tab 2. Scroll down to the attestations section — a new 5-star row appeared automatically from the paid call in Segment 1.

> "Here is what makes this different from every other x402 project. After every successful paid call, the proxy automatically anchors a 5-star attestation on the Soroban EndpointRegistry — tied to the real wallet that paid. No human triggered that. No human approved it."

Click the "on-chain" link next to the auto-attestation row. It opens Stellar Expert showing the real `attest()` contract call with the payer's Stellar address.

> "There it is — a permanent reputation event on Soroban. Reputation builds with every call, automatically, on chain, with no human in the loop."

Scroll further to the "Rate this endpoint" form. Submit a 5-star rating with a short comment like "Fast and accurate".

> "Callers can also leave a written comment. That too calls `attest()` on chain — same contract, same permanent trail. AI agents can read this to pick the best tool. No platform can fake it."

---

## Segment 3 — listing a new paid endpoint (1:35 – 2:00)

Switch to a terminal. Type:

```bash
npx stellarpay402 register --url https://catfact.ninja/fact --price 0.01 --name "Cat Facts"
```

The terminal prints the proxy URL and a Stellar Expert link for the on-chain registration.

> "That is the developer side. One command. No browser. The CLI registers the endpoint, anchors it on the Soroban EndpointRegistry, and prints the proof — all in under 10 seconds."

Switch to Tab 3 (dashboard). The new endpoint appears there with the green "on-chain" badge.

Click the on-chain badge → Stellar Expert → Soroban contract call.

> "Contract `CCCCETOW…XZYA7`. You can verify every listing is real without trusting me."

---

## Segment 4 — new tool appears instantly (2:00 – 2:20)

Back to Claude Desktop, same session. Type:

```
List your stellarpay402 tools.
```

Claude lists the new `n4buhayk_cats` tool alongside the others.

> "Same session. The new endpoint just appeared as a tool — no restart, no config change. Now watch."

Type:

```
Call n4buhayk_cats and give me a cat fact.
```

Claude calls it, pays USDC, returns the cat fact and a Stellar Expert link.

> "Registered 30 seconds ago. Already earning USDC. Zero code on either side."

---

## Closing (2:20 – 2:30)

Show Tab 1 (marketplace) with the "AI Agent" badge, "on-chain" badges, and star ratings visible on the cards.

> "StellarPay402. The first agent-to-agent API marketplace on Stellar. Any AI can sell. Any AI can buy. Everything is on chain. Built for Stellar Hacks: Agents 2026."

---

## Shot list (what judges will remember)

| # | Shot | Why it matters |
|---|------|----------------|
| 1 | Claude asking the AI Answer Agent — two AIs transacting | The "never seen before" moment |
| 2 | Stellar Expert tx showing real USDC settlement | Proof it's not a mock |
| 3 | Receipts page showing the new row appear live | Visual on-chain proof |
| 4 | Auto-attestation row appears after paid call → Stellar Expert showing the `attest()` call | On-chain reputation fires automatically — no human needed |
| 5 | Endpoint creation → on-chain badge → Soroban tx | Developer side is 2 fields |
| 6 | New endpoint instantly callable from same Claude session | Marketplace is live, not pre-baked |
| 7 | Marketplace cards with "AI Agent" badge + stars visible | Full A2A catalog at a glance |

---

## Backup plan if Claude misbehaves

If the MCP server fails to load in Claude Desktop:

1. Quit Claude Desktop. `pkill -f stellarpay402-mcp`. Reopen Claude.
2. If still broken, switch to the script demo:
   ```bash
   node scripts/test-payment.mjs
   ```
   Narrate: *"This is exactly what the MCP server does under the hood — signs an x402 payment, settles on Stellar."* The visual is weaker but the proof is identical.
3. Tab 2 (receipts page) and Stellar Expert still tell the same story.

---

## Things NOT to do

- Do not show terminal logs unless absolutely necessary
- Do not narrate code line by line
- Do not show the login / signup flow
- Do not say "hopefully" or "I think"
- Do not mention features that are not built
- Do not exceed 3 minutes
- Do not reveal any secret key (`S...`) on screen

---

## DoraHacks submission copy

**One-liner**

> The first agent-to-agent API marketplace on Stellar — one AI sells its output, another AI pays for it in USDC, everything anchored on Soroban.

**What it is**

> StellarPay402 is a self-hosted x402 facilitator and pay-per-call proxy, a published MCP server (`@davidmaronio/stellarpay402-mcp` on npm), and a Soroban EndpointRegistry contract. Developers list paid APIs through a dashboard. AI agents discover them via MCP and pay autonomously. A built-in AI Answer Agent endpoint (powered by Claude Haiku) lets you demo full agent-to-agent commerce: one AI sells, another AI pays, zero humans.

**Why it stands out**

> Every other x402 project puts the AI on the buying side. StellarPay402 puts it on both sides. The built-in AI Answer Agent is listed in the marketplace as an AI-powered endpoint. Claude Desktop discovers it via MCP, pays $0.01 USDC on Stellar, and gets an AI-generated answer — agent buys from agent, on chain, in five seconds. After every paid call, the caller can submit a 1–5 star attestation anchored to the Soroban EndpointRegistry via the `attest()` function — no auth required, the x402 payment itself is the spam filter. On-chain reputation builds automatically. A per-payer hourly USDC spending cap is enforced at the proxy layer to stop runaway agents.

**Live demo:** <https://stellar-pay402.vercel.app>
**Repo:** <https://github.com/davidmaronio/StellarPay402>
**npm (MCP server):** <https://www.npmjs.com/package/@davidmaronio/stellarpay402-mcp>
**npm (CLI):** <https://www.npmjs.com/package/stellarpay402>
**Soroban contract (testnet):** `CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7`
