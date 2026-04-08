import Link from "next/link";
import { db, endpoints, payments, users, attestations } from "@/lib/db";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Activity, Wallet, BarChart3, ExternalLink, Star } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { Steps, type Step } from "@/components/ui/steps";
import { MarketingHeader } from "@/components/ui/marketing-header";
import { AttestForm } from "@/components/ui/attest-form";

export const dynamic = "force-dynamic";

function shortenAddress(addr: string | null): string {
  if (!addr) return "unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

  const [ratingRow] = await db
    .select({ avg: avg(attestations.rating), total: count(attestations.id) })
    .from(attestations)
    .where(eq(attestations.endpointId, endpoint.id));

  const recentAttestations = await db
    .select()
    .from(attestations)
    .where(eq(attestations.endpointId, endpoint.id))
    .orderBy(desc(attestations.createdAt))
    .limit(20);

  const avgRating  = ratingRow?.avg ? parseFloat(ratingRow.avg) : null;
  const ratingCount = ratingRow?.total ?? 0;

  const proxyUrl = `/${userSlug}/${slug}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stroops = Math.round(endpoint.priceUsdc * 1e7).toString();

  const callSteps: Step[] = [
    {
      title: "Curl (manual)",
      description:
        "Hit the URL, get a 402 with x402 payment requirements, sign and retry. Lowest level — no SDK needed.",
      badge: "Low level",
      badgeTone: "default",
      children: (
        <CodeBlock
          filename="terminal"
          language="bash"
          code={`# 1. Probe the endpoint, get x402 requirements
curl -i ${appUrl}${proxyUrl}

# -> HTTP/1.1 402 Payment Required
# -> {"x402Version":2,"accepts":[{
# ->   "scheme":"exact","network":"stellar:testnet",
# ->   "amount":"${stroops}","asset":"<USDC SAC>",
# ->   "payTo":"${endpoint.stellarAddress}"
# -> }]}

# 2. Build an x402 payment with @x402/stellar,
#    base64-encode the payload, retry with X-PAYMENT
curl -H "X-PAYMENT: <base64 payload>" ${appUrl}${proxyUrl}

# -> HTTP/1.1 200 OK
# -> X-Payment-Receipt: <stellar tx hash>
# -> <upstream API response>`}
        />
      ),
    },
    {
      title: "JavaScript / TypeScript",
      description:
        "Use the official @x402/stellar SDK. The library handles the 402 → sign → retry loop for you.",
      badge: "Recommended",
      badgeTone: "primary",
      children: (
        <CodeBlock
          filename="call-endpoint.ts"
          language="typescript"
          code={`import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const URL = "${appUrl}${proxyUrl}";

// 1. Probe → 402
const challenge = await fetch(URL).then(r => r.json());
const requirement = challenge.accepts[0];

// 2. Build a payment payload signed by your Stellar wallet
const signer  = createEd25519Signer(process.env.STELLAR_SECRET_KEY!);
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
console.log("Result:",     result);`}
        />
      ),
    },
    {
      title: "Claude / Cursor (MCP)",
      description: `Run the StellarPay402 MCP server once. Every endpoint in this marketplace becomes a tool named ${userSlug}_${slug} that any MCP client can call. The server signs x402 payments autonomously and respects a per-session USDC budget.`,
      badge: "Zero code",
      badgeTone: "emerald",
      children: (
        <CodeBlock
          filename="claude_desktop_config.json"
          language="json"
          code={`{
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
}`}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to marketplace
        </Link>
        {/* Hero */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-10">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-3 py-1 text-xs text-secondary-foreground font-mono mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
              Live on Stellar Testnet
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {endpoint.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>
                by <span className="text-primary">@{userSlug}</span>
              </span>
              <span className="text-muted-foreground/40">·</span>
              <code className="font-mono text-xs bg-muted border border-border rounded-md px-2 py-0.5 text-foreground">
                /{userSlug}/{slug}
              </code>
            </div>
            {endpoint.description && (
              <p className="mt-4 max-w-2xl text-sm text-foreground/85 leading-relaxed">
                {endpoint.description}
              </p>
            )}
          </div>

          {/* Price card */}
          <div className="rounded-2xl border border-border bg-card px-5 py-4 text-right shrink-0 shadow-lg shadow-primary/5">
            <div className="text-3xl font-mono font-bold text-foreground tabular-nums">
              ${endpoint.priceUsdc.toFixed(4)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              USDC per call
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <Stat
            label="Total requests"
            value={endpoint.totalRequests.toString()}
            icon={<BarChart3 size={14} />}
          />
          <Stat
            label="Paid requests"
            value={endpoint.paidRequests.toString()}
            icon={<Activity size={14} />}
          />
          <Stat
            label="Total earned"
            value={`$${endpoint.totalEarned.toFixed(4)}`}
            suffix="USDC"
            icon={<Wallet size={14} />}
          />
          <Stat
            label="Avg rating"
            value={avgRating !== null ? avgRating.toFixed(1) : "—"}
            suffix={ratingCount > 0 ? `${ratingCount} reviews` : undefined}
            icon={<Star size={14} />}
          />
        </div>

        {/* How to call */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              How to call this endpoint
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three ways to pay for this API. Pick whichever matches your stack.
            </p>
          </div>
          <Steps steps={callSteps} />
        </div>

        {/* Receipts */}
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            On-chain payment receipts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every paid call settles on Stellar testnet. Click any tx hash to verify.
          </p>

          {receipts.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-3">
                <Wallet size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to call this endpoint
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Time</th>
                    <th className="px-5 py-3 text-left font-medium">Payer</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Stellar tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(r.settledAt)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-foreground/85">
                        {shortenAddress(r.payerAddress)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-foreground tabular-nums">
                        ${r.amountUsdc.toFixed(4)}
                      </td>
                      <td className="px-5 py-3">
                        {r.txHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${r.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            {r.txHash.slice(0, 8)}…{r.txHash.slice(-6)}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attestations */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent reviews */}
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight mb-1">
              On-chain attestations
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Callers rate this endpoint after paying. Anchored to Stellar via Soroban.
            </p>
            {recentAttestations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
                <Star size={20} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No attestations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttestations.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-primary font-mono tracking-wider">
                        {"★".repeat(a.rating)}
                        <span className="text-muted-foreground/40">{"★".repeat(5 - a.rating)}</span>
                      </span>
                      {a.txHash ? (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${a.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
                        >
                          on-chain <ExternalLink size={9} />
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">off-chain</span>
                      )}
                    </div>
                    {a.comment && (
                      <p className="text-xs text-foreground/80 leading-relaxed">{a.comment}</p>
                    )}
                    {a.payerAddress && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        {shortenAddress(a.payerAddress)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit attestation */}
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight mb-1">
              Rate this endpoint
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Used it? Leave a score. Agents use ratings to pick the best tool.
            </p>
            <AttestForm userSlug={userSlug} slug={slug} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary transition-colors">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
        {suffix && (
          <span className="text-xs text-muted-foreground font-mono">{suffix}</span>
        )}
      </div>
    </div>
  );
}
