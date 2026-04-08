"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Copy, ExternalLink, Zap, CheckCircle, Bot, Trash2, Anchor, RefreshCw, Pencil, X } from "lucide-react";

interface Endpoint {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  priceUsdc: number;
  stellarAddress: string;
  active: boolean;
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
    <div className="min-h-screen bg-neutral-950">
      {/* Nav */}
      <nav className="border-b border-neutral-800 sticky top-0 z-50 bg-neutral-950">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">S</div>
            <span className="font-semibold text-white text-sm">StellarPay402</span>
            <span className="text-neutral-700">/</span>
            <span className="text-neutral-500 text-sm">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-mono hidden sm:block">
              proxy slug: <span className="text-indigo-400">{user.slug ?? "—"}</span>
            </span>
            <button onClick={() => signOut().then(() => router.push("/"))}
              className="text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Endpoints</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Each endpoint is a paid proxy URL on Stellar testnet</p>
          </div>
          <Link href="/dashboard/endpoints/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} />
            New endpoint
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total endpoints",   value: endpoints.length },
            { label: "Total requests",    value: endpoints.reduce((s, e) => s + e.totalRequests, 0) },
            { label: "Total earned",      value: `$${endpoints.reduce((s, e) => s + e.totalEarned, 0).toFixed(4)} USDC` },
          ].map(s => (
            <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Endpoints list */}
        {loading ? (
          <div className="text-center py-16 text-neutral-600 text-sm">Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-xl py-16 text-center">
            <Zap size={24} className="text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">No endpoints yet</p>
            <p className="text-neutral-600 text-xs mt-1 mb-4">Create your first paid proxy endpoint</p>
            <Link href="/dashboard/endpoints/new"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus size={13} /> New endpoint
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map(ep => {
              const proxyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${user.slug}/${ep.slug}`;
              return (
                <div key={ep.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white text-sm">{ep.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${ep.active ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-neutral-500 bg-neutral-800 border-neutral-700"}`}>
                          {ep.active ? "active" : "inactive"}
                        </span>
                        {ep.onChainTxHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${ep.onChainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on-chain anchor on Stellar Expert"
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Anchor size={9} /> on-chain
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono border text-amber-400 bg-amber-500/10 border-amber-500/20" title="Not anchored on Soroban EndpointRegistry">
                            ⚠ db only
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-1 truncate max-w-xs">
                          {proxyUrl}
                        </code>
                        <button onClick={() => copyUrl(ep)}
                          className="text-neutral-500 hover:text-white transition-colors shrink-0">
                          {copied === ep.id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                        </button>
                        <a href={ep.targetUrl} target="_blank" rel="noopener noreferrer"
                          className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0">
                          <ExternalLink size={13} />
                        </a>
                        <button onClick={() => copyMcpConfig(ep)}
                          className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-indigo-400 border border-neutral-800 hover:border-indigo-500/40 rounded px-2 py-1 transition-colors shrink-0">
                          {copiedMcp === ep.id
                            ? <><CheckCircle size={10} className="text-green-400" /> Copied!</>
                            : <><Bot size={10} /> MCP</>
                          }
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="text-sm font-mono font-bold text-green-400">${ep.priceUsdc.toFixed(4)}</p>
                        <p className="text-[10px] text-neutral-600">per request</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{ep.paidRequests}</p>
                        <p className="text-[10px] text-neutral-600">paid reqs</p>
                      </div>
                      <div>
                        <p className="text-sm font-mono font-bold text-indigo-400">${ep.totalEarned.toFixed(4)}</p>
                        <p className="text-[10px] text-neutral-600">earned</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800">
                    {!ep.onChainTxHash && (
                      <button
                        onClick={() => reanchorEndpoint(ep)}
                        className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-emerald-400 border border-neutral-800 hover:border-emerald-500/40 rounded-md px-2.5 py-1.5 transition-colors"
                        title="Retry on-chain registration"
                      >
                        <RefreshCw size={11} />
                        Re-anchor on-chain
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(ep)}
                      className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-indigo-400 border border-neutral-800 hover:border-indigo-500/40 rounded-md px-2.5 py-1.5 transition-colors ml-auto"
                    >
                      <Pencil size={11} />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEndpoint(ep)}
                      className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 rounded-md px-2.5 py-1.5 transition-colors"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit endpoint</h2>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono">/{user.slug}/{editing.slug}</p>
              </div>
              <button
                onClick={() => !savingEdit && setEditing(null)}
                className="text-neutral-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Name</label>
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Target URL</label>
                <input
                  name="targetUrl"
                  type="url"
                  defaultValue={editing.targetUrl}
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Price (USDC)</label>
                  <input
                    name="priceUsdc"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    defaultValue={editing.priceUsdc}
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={editing.active}
                      className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-950"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Stellar payout address</label>
                <input
                  name="stellarAddress"
                  defaultValue={editing.stellarAddress}
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={savingEdit}
                  className="text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
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
