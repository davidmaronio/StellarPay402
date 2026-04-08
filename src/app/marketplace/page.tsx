"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, CheckCircle, Zap, Search, Bot } from "lucide-react";

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
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Nav */}
      <nav className="border-b border-neutral-900 sticky top-0 z-50 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">S</div>
              <span className="font-semibold text-sm">StellarPay402</span>
            </Link>
            <span className="text-neutral-700">/</span>
            <span className="text-sm text-neutral-400">Marketplace</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
              List your API
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-xs text-indigo-400 font-mono mb-4">
            <Bot size={11} />
            Agent-to-Agent Marketplace
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Browse paid API endpoints</h1>
          <p className="text-neutral-400 text-sm max-w-xl">
            Every endpoint below is an x402-gated API. AI agents can call these directly — payment in USDC settles on Stellar testnet per request. Copy the MCP config to add any endpoint to your agent.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search endpoints…"
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 focus:border-indigo-500/60 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors"
          />
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 text-xs text-neutral-500">
          <span><span className="text-white font-medium">{endpoints.length}</span> endpoints live</span>
          <span><span className="text-white font-medium">{endpoints.reduce((s, e) => s + e.paidRequests, 0)}</span> paid requests total</span>
          <span><span className="text-green-400 font-medium">${endpoints.reduce((s, e) => s + e.priceUsdc * e.paidRequests, 0).toFixed(4)}</span> USDC settled</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-neutral-600 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-xl py-20 text-center">
            <Zap size={24} className="text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">
              {search ? "No endpoints match your search" : "No endpoints listed yet"}
            </p>
            <p className="text-neutral-600 text-xs mt-1 mb-4">
              {search ? "Try a different search term" : "Be the first to list a paid API"}
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              List your API
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(ep => {
              const proxyUrl   = `/${ep.userSlug}/${ep.slug}`;
              const detailHref = `/marketplace/${ep.userSlug}/${ep.slug}`;
              return (
                <Link
                  key={ep.id}
                  href={detailHref}
                  className="group block bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 hover:bg-neutral-900/80 rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">
                        {ep.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        by <span className="text-indigo-400">@{ep.userSlug}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-green-400">${ep.priceUsdc.toFixed(4)}</p>
                      <p className="text-[10px] text-neutral-600">per request</p>
                    </div>
                  </div>

                  {ep.description && (
                    <p className="text-xs text-neutral-400 mb-3 leading-relaxed">{ep.description}</p>
                  )}

                  <code className="block text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-1.5 font-mono truncate mb-3">
                    {proxyUrl}
                  </code>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-600">
                      <span className="text-neutral-400">{ep.paidRequests}</span> paid calls
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyMcpConfig(ep); }}
                      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {copied === ep.id
                        ? <><CheckCircle size={11} className="text-green-400" /> Copied!</>
                        : <><Copy size={11} /> Copy MCP config</>
                      }
                    </button>
                  </div>

                  <p className="mt-3 text-[10px] text-neutral-600 group-hover:text-indigo-400 transition-colors">
                    View details + how to call →
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {/* What is MCP section */}
        <div className="mt-12 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Using the marketplace from an AI agent</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Clone the repo and run the StellarPay402 MCP server once. Every public endpoint above becomes a tool any MCP-aware assistant (Claude Desktop, Cursor, Cline) can call. The server signs x402 payments on the agent's behalf and respects a per-session USDC budget.
          </p>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-300 overflow-x-auto">
            <div className="text-neutral-600 mb-1">{"// ~/Library/Application Support/Claude/claude_desktop_config.json"}</div>
            <pre className="leading-snug whitespace-pre">{`{
  "mcpServers": {
    "stellarpay402": {
      "command": "node",
      "args": ["/absolute/path/to/StellarPay402/mcp-server/index.mjs"],
      "env": {
        "STELLAR_SECRET_KEY":   "S...your testnet secret...",
        "MARKETPLACE_URL":      "http://localhost:3000",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}`}</pre>
          </div>
          <p className="mt-4 text-[11px] text-neutral-500">
            Click any endpoint card above to see per-endpoint instructions for curl, JavaScript and MCP.
          </p>
        </div>
      </main>
    </div>
  );
}
