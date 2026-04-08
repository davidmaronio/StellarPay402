"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Copy, ExternalLink, Zap, CheckCircle, Bot, Trash2, Anchor, RefreshCw, Pencil, X, LayoutGrid, Activity, Wallet } from "lucide-react";
import { AppHeader } from "@/components/ui/app-header";

interface Endpoint {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  priceUsdc: number;
  stellarAddress: string;
  active: boolean;
  isAiPowered: boolean;
  totalRequests: number;
  paidRequests: number;
  totalEarned: number;
  onChainTxHash: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState<string | null>(null);
  const [copiedMcp, setCopiedMcp] = useState<string | null>(null);
  const [editing, setEditing]     = useState<Endpoint | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/endpoints")
      .then(r => r.json())
      .then(data => { setEndpoints(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  function copyUrl(endpoint: Endpoint) {
    const url = `${window.location.origin}/${(session?.user as any)?.slug ?? ""}/${endpoint.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(endpoint.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyMcpConfig(endpoint: Endpoint) {
    const userSlug = (session?.user as any)?.slug ?? "";
    const res  = await fetch(`/api/mcp/${userSlug}/${endpoint.slug}`);
    const data = await res.json();
    navigator.clipboard.writeText(JSON.stringify(data.mcpServerConfig, null, 2));
    setCopiedMcp(endpoint.id);
    setTimeout(() => setCopiedMcp(null), 2000);
  }

  async function deleteEndpoint(endpoint: Endpoint) {
    if (!confirm(`Delete "${endpoint.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/endpoints/${endpoint.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete endpoint");
      return;
    }
    setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    const form = new FormData(e.currentTarget);
    const body = {
      name:           form.get("name"),
      targetUrl:      form.get("targetUrl"),
      priceUsdc:      form.get("priceUsdc"),
      stellarAddress: form.get("stellarAddress"),
      description:    form.get("description"),
      active:         form.get("active") === "on",
      isAiPowered:    form.get("isAiPowered") === "on",
    };
    const res = await fetch(`/api/endpoints/${editing.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to update endpoint");
      return;
    }
    const updated = await res.json();
    setEndpoints((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
  }

  async function reanchorEndpoint(endpoint: Endpoint) {
    const res = await fetch(`/api/endpoints/${endpoint.id}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "On-chain anchor failed");
      return;
    }
    const updated = await res.json();
    setEndpoints((prev) => prev.map((e) => (e.id === endpoint.id ? updated : e)));
  }

  if (isPending || !session) return null;

  const user = session.user as any;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-3 py-1 text-xs text-secondary-foreground font-mono mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
              Stellar Testnet
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Welcome back, <span className="text-primary">{user.name?.split(" ")[0] ?? "developer"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Each endpoint is a paid proxy URL anchored on Soroban
            </p>
          </div>
          <Link
            href="/dashboard/endpoints/new"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20 self-start sm:self-auto"
          >
            <Plus size={15} />
            New endpoint
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Total endpoints",
              value: endpoints.length.toString(),
              icon: LayoutGrid,
            },
            {
              label: "Total requests",
              value: endpoints.reduce((s, e) => s + e.totalRequests, 0).toString(),
              icon: Activity,
            },
            {
              label: "Total earned",
              value: `$${endpoints.reduce((s, e) => s + e.totalEarned, 0).toFixed(4)}`,
              suffix: "USDC",
              icon: Wallet,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                  <s.icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{s.value}</p>
                {s.suffix && (
                  <span className="text-xs text-muted-foreground font-mono">{s.suffix}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Endpoints list */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground/70 text-sm">Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl py-20 text-center bg-card/30">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
              <Zap size={22} className="text-primary" />
            </div>
            <h3 className="text-foreground text-base font-semibold">No endpoints yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-xs mx-auto">
              Create your first paid proxy endpoint to start earning USDC on Stellar
            </p>
            <Link
              href="/dashboard/endpoints/new"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={14} /> Create your first endpoint
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => {
              const proxyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${user.slug}/${ep.slug}`;
              return (
                <div
                  key={ep.id}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
                >
                  {/* Top row: name, status badges, stats */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-base">{ep.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                            ep.active
                              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                              : "text-muted-foreground bg-muted border-border"
                          }`}
                        >
                          {ep.active ? "● active" : "○ inactive"}
                        </span>
                        {ep.isAiPowered && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono border text-primary bg-primary/10 border-primary/30">
                            <Bot size={9} /> AI Agent
                          </span>
                        )}
                        {ep.onChainTxHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${ep.onChainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on-chain anchor on Stellar Expert"
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono border text-emerald-300 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Anchor size={9} /> on-chain
                          </a>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono border text-amber-300 bg-amber-500/10 border-amber-500/30"
                            title="Not anchored on Soroban EndpointRegistry"
                          >
                            ⚠ db only
                          </span>
                        )}
                      </div>

                      {/* Proxy URL pill row */}
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-primary bg-muted border border-border rounded-lg px-3 py-1.5 truncate max-w-md font-mono">
                          {proxyUrl}
                        </code>
                        <button
                          onClick={() => copyUrl(ep)}
                          title="Copy proxy URL"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1.5 rounded-lg hover:bg-muted"
                        >
                          {copied === ep.id ? (
                            <CheckCircle size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <a
                          href={ep.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open target URL"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1.5 rounded-lg hover:bg-muted"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Right-aligned stats */}
                    <div className="flex items-center gap-5 sm:gap-6 text-right shrink-0">
                      <div>
                        <p className="text-base font-mono font-bold text-foreground tabular-nums">
                          ${ep.priceUsdc.toFixed(4)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          per call
                        </p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-base font-bold text-foreground tabular-nums">
                          {ep.paidRequests}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          paid
                        </p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-base font-mono font-bold text-primary tabular-nums">
                          ${ep.totalEarned.toFixed(4)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          earned
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                    <button
                      onClick={() => copyMcpConfig(ep)}
                      className="flex items-center gap-1.5 text-xs text-secondary-foreground bg-secondary hover:bg-accent border border-border rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {copiedMcp === ep.id ? (
                        <>
                          <CheckCircle size={12} className="text-emerald-400" /> MCP config copied
                        </>
                      ) : (
                        <>
                          <Bot size={12} /> Copy MCP config
                        </>
                      )}
                    </button>

                    {!ep.onChainTxHash && (
                      <button
                        onClick={() => reanchorEndpoint(ep)}
                        className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg px-3 py-1.5 transition-colors"
                        title="Retry on-chain registration"
                      >
                        <RefreshCw size={12} /> Re-anchor
                      </button>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setEditing(ep)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 hover:bg-muted rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => deleteEndpoint(ep)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-300 border border-border hover:border-red-500/40 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Edit endpoint</h2>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  /{user.slug}/{editing.slug}
                </p>
              </div>
              <button
                onClick={() => !savingEdit && setEditing(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Target URL
                </label>
                <input
                  name="targetUrl"
                  type="url"
                  defaultValue={editing.targetUrl}
                  required
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Price (USDC)
                  </label>
                  <input
                    name="priceUsdc"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    defaultValue={editing.priceUsdc}
                    required
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={editing.active}
                      className="rounded border-border bg-muted text-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Stellar payout address
                </label>
                <input
                  name="stellarAddress"
                  defaultValue={editing.stellarAddress}
                  required
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" name="isAiPowered" defaultChecked={editing.isAiPowered} className="sr-only peer" />
                  <div className="w-10 h-6 bg-muted border border-border rounded-full peer-checked:bg-primary transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Bot size={13} className="text-primary" /> AI-powered endpoint
                  </div>
                  <p className="text-xs text-muted-foreground">Shows "AI Agent" badge in the marketplace</p>
                </div>
              </label>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-primary/20"
                >
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={savingEdit}
                  className="text-sm text-secondary-foreground bg-secondary hover:bg-accent border border-border px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
