import { NextRequest, NextResponse } from "next/server";

/**
 * Demo "AI Agent" endpoint — this is the target URL behind the StellarPay402
 * proxy. When registered in the marketplace as an AI-powered endpoint, any
 * other AI agent can discover it via MCP, pay $0.01 USDC, and receive an
 * AI-generated answer.
 *
 * If ANTHROPIC_API_KEY is set the response comes from Claude Haiku.
 * Otherwise a rich mock response is returned so the demo works without
 * an API key.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("question") ?? "";
  return answer(q);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const q = body.q ?? body.question ?? body.prompt ?? "";
  return answer(q);
}

async function answer(question: string) {
  const start = Date.now();

  if (!question) {
    return NextResponse.json(
      { error: "Pass ?q=your+question or a JSON body with { question }" },
      { status: 400 },
    );
  }

  let text: string;
  let model: string;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    // Call Claude Haiku — fastest, cheapest, ideal for pay-per-call agents
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages:   [{ role: "user", content: question }],
        system:
          "You are a concise, expert AI assistant operating as a paid API endpoint on StellarPay402 — " +
          "an agent-to-agent API marketplace built on Stellar using the x402 protocol. " +
          "x402 is an HTTP micropayment protocol: APIs return HTTP 402 (Payment Required) when called without payment. " +
          "The caller signs a USDC payment on Stellar and retries with an X-PAYMENT header. " +
          "StellarPay402 uses x402 so AI agents can autonomously discover and pay for APIs with no human approval. " +
          "Every endpoint is anchored on a Soroban smart contract (EndpointRegistry) for trustless verification. " +
          "Answer any question accurately and concisely in 2–4 sentences. Be direct and expert.",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    text  = data.content?.[0]?.text ?? "No response";
    model = "claude-haiku-4-5-20251001";
  } else {
    // Rich mock — works without an API key for demo / local dev
    text  = generateMock(question);
    model = "mock-agent-v1";
  }

  return NextResponse.json({
    question,
    answer:      text,
    model,
    latencyMs:   Date.now() - start,
    paidVia:     "x402 · Stellar testnet · USDC",
    poweredBy:   "StellarPay402 agent-to-agent marketplace",
    generatedAt: new Date().toISOString(),
  });
}

function generateMock(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes("stellar"))
    return "Stellar is a decentralized payment network designed for fast, low-cost cross-border transactions. It uses the Stellar Consensus Protocol (SCP) for 5-second finality and sub-cent fees, making it ideal for micropayment rails like x402.";
  if (lower.includes("x402") || lower.includes("payment"))
    return "x402 is an HTTP payment protocol that uses status code 402 (Payment Required) to gate API access. The client receives payment requirements in the 402 response, signs a payment with their wallet, and retries with an X-PAYMENT header. Settlement happens on-chain in seconds.";
  if (lower.includes("mcp") || lower.includes("agent"))
    return "MCP (Model Context Protocol) allows AI agents to discover and call external tools automatically. StellarPay402 exposes every marketplace endpoint as an MCP tool, so agents can discover, pay for, and consume APIs with zero human intervention.";
  if (lower.includes("usdc"))
    return "USDC is a USD-pegged stablecoin issued by Circle. On Stellar testnet it trades as a Stellar Asset Contract (SAC). StellarPay402 uses USDC for all pay-per-call settlements via the x402 protocol.";
  return `This AI agent answers questions sold pay-per-call on StellarPay402. Your question was: "${q}". In production this agent is backed by Claude Haiku — fast, accurate, and settled on Stellar in 5 seconds.`;
}
