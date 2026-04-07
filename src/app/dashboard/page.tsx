"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Copy, ExternalLink, Zap, CheckCircle } from "lucide-react";

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
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState<string | null>(null);

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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white text-sm">{ep.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${ep.active ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-neutral-500 bg-neutral-800 border-neutral-700"}`}>
                          {ep.active ? "active" : "inactive"}
                        </span>
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
