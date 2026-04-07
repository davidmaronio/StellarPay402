"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewEndpointPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", slug: "", targetUrl: "", priceUsdc: "0.01",
    stellarAddress: "", description: "",
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <nav className="border-b border-neutral-800 sticky top-0 z-50 bg-neutral-950">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <span className="font-semibold text-white text-sm">New endpoint</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Endpoint details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Name</label>
                <input required value={form.name} onChange={e => update("name", e.target.value)}
                  placeholder="Weather API"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Slug</label>
                <input required value={form.slug} onChange={e => update("slug", e.target.value)}
                  placeholder="weather"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors font-mono" />
                <p className="text-[10px] text-neutral-600 mt-1">Used in proxy URL: /you/<span className="text-indigo-400">{form.slug || "slug"}</span></p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Target URL</label>
              <input required type="url" value={form.targetUrl} onChange={e => update("targetUrl", e.target.value)}
                placeholder="https://api.openweathermap.org/data/2.5/weather"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors" />
              <p className="text-[10px] text-neutral-600 mt-1">The real API URL requests will be forwarded to after payment</p>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Description <span className="text-neutral-600">(optional)</span></label>
              <input value={form.description} onChange={e => update("description", e.target.value)}
                placeholder="Real-time weather data"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors" />
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Payment settings</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Price per request (USDC)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                  <input required type="number" step="0.0001" min="0.0001" max="100"
                    value={form.priceUsdc} onChange={e => update("priceUsdc", e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white font-mono outline-none transition-colors" />
                </div>
              </div>
              <div className="flex items-end">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-neutral-500 w-full">
                  <span className="text-green-400 font-mono font-bold text-sm">${(parseFloat(form.priceUsdc || "0") * 1000).toFixed(2)}</span>
                  <span className="text-neutral-600"> per 1k calls</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Stellar wallet address</label>
              <input required value={form.stellarAddress} onChange={e => update("stellarAddress", e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors font-mono" />
              <p className="text-[10px] text-neutral-600 mt-1">Payments will be settled to this Stellar testnet address</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <Link href="/dashboard"
              className="px-4 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
              {loading ? "Creating…" : "Create endpoint"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
