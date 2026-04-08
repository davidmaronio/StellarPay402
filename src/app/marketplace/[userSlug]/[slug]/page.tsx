import Link from "next/link";
import { db, endpoints, payments, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function shortenAddress(addr: string | null): string {
  if (!addr) return "unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default async function EndpointReceiptsPage({
  params,
}: {
  params: Promise<{ userSlug: string; slug: string }>;
}) {
  const { userSlug, slug } = await params;

  const [user] = await db.select().from(users).where(eq(users.slug, userSlug)).limit(1);
  if (!user) notFound();

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, slug)))
    .limit(1);
  if (!endpoint) notFound();

  const receipts = await db
    .select()
    .from(payments)
    .where(eq(payments.endpointId, endpoint.id))
    .orderBy(desc(payments.settledAt))
    .limit(50);

  const proxyUrl = `/${userSlug}/${slug}`;
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stroops  = Math.round(endpoint.priceUsdc * 1e7).toString();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/marketplace" className="text-sm text-neutral-400 hover:text-white">
          ← Back to marketplace
        </Link>

        <div className="mt-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{endpoint.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              by <span className="text-neutral-300">{user.name}</span> · /{userSlug}/{slug}
            </p>
            {endpoint.description && (
              <p className="mt-3 max-w-2xl text-neutral-300">{endpoint.description}</p>
            )}
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-right">
            <div className="text-2xl font-mono font-semibold text-emerald-400">
              {endpoint.priceUsdc.toFixed(4)}
            </div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">USDC / call</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Total requests"  value={endpoint.totalRequests.toString()} />
          <Stat label="Paid requests"   value={endpoint.paidRequests.toString()} />
          <Stat label="Total earned"    value={`${endpoint.totalEarned.toFixed(4)} USDC`} />
        </div>

        {/* How to call */}
        <div className="mt-10 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">How to call this endpoint</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Three ways to pay for this API. Pick whichever matches your stack.
            </p>
          </div>

          {/* 1. Curl */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">1. Curl (manual)</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Hit the URL, get a 402 with x402 payment requirements, sign and retry.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Low level</span>
            </div>
            <pre className="overflow-x-auto rounded-md bg-neutral-950 border border-neutral-900 p-4 text-xs text-neutral-300">
              <code>{`# Step 1 — Probe the endpoint, get x402 requirements
curl -i ${appUrl}${proxyUrl}

# → HTTP/1.1 402 Payment Required
# → {"x402Version":2,"accepts":[{
# →   "scheme":"exact","network":"stellar:testnet",
# →   "amount":"${stroops}","asset":"<USDC SAC>",
# →   "payTo":"${endpoint.stellarAddress}"
# → }]}

# Step 2 — Build an x402 payment with the @x402/stellar SDK,
# base64-encode the payload, then retry with X-PAYMENT
curl -H "X-PAYMENT: <base64 payload>" ${appUrl}${proxyUrl}

# → HTTP/1.1 200 OK
# → X-Payment-Receipt: <stellar tx hash>
# → <upstream API response>`}</code>
            </pre>
          </div>

          {/* 2. JavaScript SDK */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">2. JavaScript / TypeScript</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Use the official <code className="text-neutral-300">@x402/stellar</code> SDK.
                  The library handles the 402 → sign → retry loop for you.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Recommended</span>
            </div>
            <pre className="overflow-x-auto rounded-md bg-neutral-950 border border-neutral-900 p-4 text-xs text-neutral-300">
              <code>{`import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const URL = "${appUrl}${proxyUrl}";

// 1. Probe → 402
const challenge = await fetch(URL).then(r => r.json());
const requirement = challenge.accepts[0];

// 2. Build a payment payload signed by your Stellar wallet
const signer  = createEd25519Signer(process.env.STELLAR_SECRET_KEY);
const scheme  = new ExactStellarScheme(signer);
const payload = await scheme.createPaymentPayload(2, {
  ...requirement,
  resource: URL,
  extra:    { areFeesSponsored: true },
});
const header = Buffer.from(
  JSON.stringify({ ...payload, accepted: requirement })
).toString("base64");

// 3. Retry with the payment header
const res    = await fetch(URL, { headers: { "X-PAYMENT": header } });
const result = await res.json();
console.log("Settled tx:", res.headers.get("x-payment-receipt"));
console.log("Result:",     result);`}</code>
            </pre>
          </div>

          {/* 3. Claude / MCP */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">3. Claude / Cursor (MCP)</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Run the StellarPay402 MCP server once. Every endpoint in this marketplace becomes an AI tool with auto-payments.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Zero code</span>
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              Add this to your <code className="text-neutral-300">claude_desktop_config.json</code> — no clone, no install:
            </p>
            <pre className="overflow-x-auto rounded-md bg-neutral-950 border border-neutral-900 p-4 text-xs text-neutral-300">
              <code>{`{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY":   "S...your testnet secret...",
        "MARKETPLACE_URL":      "${appUrl}",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}`}</code>
            </pre>
            <p className="mt-3 text-xs text-neutral-400">
              Restart Claude Desktop. Every public endpoint in this marketplace will appear as a tool named <code className="text-neutral-200">{userSlug}_{slug}</code>. The AI signs x402 payments autonomously and respects the per-session USDC budget.
            </p>
          </div>
        </div>

        {/* Receipts */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">On-chain payment receipts</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Every paid call settles on Stellar testnet. Click any tx hash to verify.
          </p>

          {receipts.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center text-sm text-neutral-500">
              No payments yet. Be the first to call this endpoint.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/60 text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Payer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Stellar tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {receipts.map(r => (
                    <tr key={r.id} className="hover:bg-neutral-900/40">
                      <td className="px-4 py-3 text-neutral-400">{formatDate(r.settledAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-300">
                        {shortenAddress(r.payerAddress)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        {r.amountUsdc.toFixed(4)} USDC
                      </td>
                      <td className="px-4 py-3">
                        {r.txHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${r.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-emerald-400 hover:underline"
                          >
                            {r.txHash.slice(0, 8)}…{r.txHash.slice(-6)} ↗
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-600">pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-xl text-neutral-100">{value}</div>
    </div>
  );
}
