"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Wallet, Plus } from "lucide-react";
import { AppHeader } from "@/components/ui/app-header";

export default function NewEndpointPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    targetUrl: "",
    priceUsdc: "0.01",
    stellarAddress: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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
    if (!res.ok) {
      setError(data.error ?? "Failed");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  const per1k = (parseFloat(form.priceUsdc || "0") * 1000).toFixed(2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-5 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-3 py-1 text-xs text-secondary-foreground font-mono mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            New endpoint
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Monetize an API in <span className="text-primary">one screen</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            Paste your HTTPS API URL and set a USDC price per request. We&apos;ll give you a paid
            proxy URL anchored on Soroban.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Endpoint details card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                <Globe size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Endpoint details</h2>
                <p className="text-xs text-muted-foreground">What you&apos;re exposing</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Weather API"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Slug
                </label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="weather"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                  /you/<span className="text-primary">{form.slug || "slug"}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Target URL
              </label>
              <input
                required
                type="url"
                value={form.targetUrl}
                onChange={(e) => update("targetUrl", e.target.value)}
                placeholder="https://api.openweathermap.org/data/2.5/weather"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                The real API URL requests will be forwarded to after payment
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Description{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Real-time weather data"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Payment settings card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Payment settings</h2>
                <p className="text-xs text-muted-foreground">Where USDC settles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Price per request (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                    $
                  </span>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="100"
                    value={form.priceUsdc}
                    onChange={(e) => update("priceUsdc", e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <div className="bg-muted border border-border rounded-lg px-4 py-2.5 text-xs w-full">
                  <span className="text-foreground font-mono font-bold text-base tabular-nums">
                    ${per1k}
                  </span>
                  <span className="text-muted-foreground"> per 1k calls</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Stellar wallet address
              </label>
              <input
                required
                value={form.stellarAddress}
                onChange={(e) => update("stellarAddress", e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Payments will be settled to this Stellar testnet address
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm text-secondary-foreground bg-secondary hover:bg-accent border border-border transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
            >
              {loading ? (
                "Creating…"
              ) : (
                <>
                  <Plus size={15} />
                  Create endpoint
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
