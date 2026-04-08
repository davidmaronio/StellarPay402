"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, CheckCircle, Zap, Search, Bot } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { MarketingHeader } from "@/components/ui/marketing-header";
import { AppHeader } from "@/components/ui/app-header";
import { useSession } from "@/lib/auth-client";

interface MarketplaceEndpoint {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceUsdc: number;
  totalRequests: number;
  paidRequests: number;
  userSlug: string;
  userName: string;
}

export default function MarketplacePage() {
  const [endpoints, setEndpoints] = useState<MarketplaceEndpoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [copied, setCopied]       = useState<string | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/marketplace")
      .then(r => r.json())
      .then(data => { setEndpoints(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function copyMcpConfig(ep: MarketplaceEndpoint) {
    const res  = await fetch(`/api/mcp/${ep.userSlug}/${ep.slug}`);
    const data = await res.json();
    navigator.clipboard.writeText(JSON.stringify(data.mcpServerConfig, null, 2));
    setCopied(ep.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = endpoints.filter(ep =>
    !search ||
    ep.name.toLowerCase().includes(search.toLowerCase()) ||
    (ep.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ep.userSlug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {session ? <AppHeader /> : <MarketingHeader />}

      <main className="max-w-5xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-3 py-1 text-xs text-secondary-foreground font-mono mb-4">
            <Bot size={11} className="text-primary" />
            Agent-to-Agent Marketplace
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Browse paid API endpoints</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Every endpoint below is an x402 gated API. AI agents can call these directly. Payment in USDC settles on Stellar testnet per request. Copy the MCP config to add any endpoint to your agent.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints…"
            className="w-full max-w-md bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 text-xs text-muted-foreground flex-wrap">
          <span>
            <span className="text-foreground font-semibold tabular-nums">{endpoints.length}</span> endpoints live
          </span>
          <span className="w-px h-3 bg-border" />
          <span>
            <span className="text-foreground font-semibold tabular-nums">
              {endpoints.reduce((s, e) => s + e.paidRequests, 0)}
            </span>{" "}
            paid requests
          </span>
          <span className="w-px h-3 bg-border" />
          <span>
            <span className="text-primary font-mono font-semibold tabular-nums">
              ${endpoints.reduce((s, e) => s + e.priceUsdc * e.paidRequests, 0).toFixed(4)}
            </span>{" "}
            USDC settled
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground/70 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center">
            <Zap size={24} className="text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              {search ? "No endpoints match your search" : "No endpoints listed yet"}
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1 mb-4">
              {search ? "Try a different search term" : "Be the first to list a paid API"}
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              List your API
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((ep) => {
              const proxyUrl = `/${ep.userSlug}/${ep.slug}`;
              const detailHref = `/marketplace/${ep.userSlug}/${ep.slug}`;
              return (
                <Link
                  key={ep.id}
                  href={detailHref}
                  className="group relative block bg-card border border-border hover:border-primary/40 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Top row: name + price */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors truncate">
                        {ep.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by <span className="text-primary">@{ep.userSlug}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-mono font-bold text-foreground tabular-nums">
                        ${ep.priceUsdc.toFixed(4)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        per call
                      </p>
                    </div>
                  </div>

                  {ep.description && (
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {ep.description}
                    </p>
                  )}

                  {/* Proxy URL pill */}
                  <code className="block text-[11px] text-primary bg-muted border border-border rounded-lg px-2.5 py-1.5 font-mono truncate mb-4">
                    {proxyUrl}
                  </code>

                  {/* Bottom row: stats + MCP copy */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">{ep.paidRequests}</span> paid calls
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyMcpConfig(ep);
                      }}
                      className="flex items-center gap-1.5 text-xs text-secondary-foreground bg-secondary hover:bg-accent border border-border rounded-lg px-2.5 py-1 transition-colors"
                    >
                      {copied === ep.id ? (
                        <>
                          <CheckCircle size={11} className="text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> MCP
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                    View details + how to call →
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {/* What is MCP section */}
        <div className="mt-12 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Using the marketplace from an AI agent</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Add one MCP server to your AI assistant. Every public endpoint above becomes a tool that any MCP client (Claude Desktop, Cursor, Cline) can call. The server signs x402 payments on the agent's behalf and respects a per session USDC budget. No clone, no install. `npx` fetches it on first run.
          </p>
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
          <p className="mt-4 text-[11px] text-muted-foreground">
            Click any endpoint card above to see per-endpoint instructions for curl, JavaScript and MCP.
          </p>
        </div>
      </main>
    </div>
  );
}
