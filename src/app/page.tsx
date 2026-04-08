import Link from "next/link";
import { ArrowRight, Zap, Globe, Bot, Store } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Nav */}
      <nav className="border-b border-neutral-900 sticky top-0 z-50 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">S</div>
            <span className="font-semibold text-sm">StellarPay402</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-sm text-neutral-400 hover:text-white transition-colors">Marketplace</Link>
            <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-xs text-indigo-400 font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
          x402 protocol · Stellar testnet · MCP-native
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          The marketplace where<br />
          <span className="text-indigo-400">AI agents pay APIs</span>
        </h1>

        <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed">
          List your API. Set a USDC price. Get a proxy URL that enforces payment on every call — and an MCP tool definition agents can plug straight into their toolbox.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/marketplace"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            <Store size={15} /> Browse marketplace
          </Link>
          <Link href="/register"
            className="flex items-center gap-2 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
            List your API <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Flow */}
      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
          <p className="text-xs text-neutral-500 text-center mb-6 uppercase tracking-wider">How it works</p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {[
              { step: "1", label: "List your API",       sub: "Paste target URL + set USDC price" },
              { step: "2", label: "Agents discover it",  sub: "Marketplace + MCP tool config" },
              { step: "3", label: "Pay per request",     sub: "USDC settles on Stellar per call" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4 flex-1 min-w-[140px]">
                {i > 0 && <ArrowRight size={14} className="text-neutral-700 shrink-0 hidden sm:block" />}
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm mx-auto mb-2">{s.step}</div>
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A2A highlight */}
      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">Built for Agent-to-Agent (A2A) payments</span>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed mb-5">
            Any AI agent — Claude, GPT, or your own — can browse the marketplace, pick an endpoint, and start calling it with automatic USDC micropayments on Stellar. No wallets to connect manually. No subscriptions. Just HTTP + x402.
          </p>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs">
            <div className="text-neutral-600 mb-1">{"# An agent calls a paid endpoint — payment is automatic"}</div>
            <div className="text-green-400">{"curl http://localhost:3000/n4buhayk/weather \\"}</div>
            <div className="text-green-400 pl-4">{"-H 'X-PAYMENT: <base64 x402 payload>'"}</div>
            <div className="text-neutral-500 mt-2">{"→ HTTP 200  X-Payment-Receipt: <stellar tx hash>"}</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { icon: Store,  title: "Public marketplace",  desc: "Browse all listed APIs. Search, filter, and copy MCP configs with one click." },
            { icon: Bot,    title: "MCP-native",          desc: "Every endpoint ships a tool definition agents can drop straight into Claude or any MCP client." },
            { icon: Zap,    title: "x402 native",         desc: "HTTP 402 payment required — the open standard for machine-readable API payments." },
            { icon: Globe,  title: "Zero code",           desc: "No SDK, no middleware. Just a URL. Works with any HTTP API out of the box." },
          ].map(f => (
            <div key={f.title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <f.icon size={18} className="text-indigo-400 mb-3" />
              <h3 className="font-semibold text-sm text-white mb-1">{f.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between text-xs text-neutral-600">
          <span>StellarPay402 — Stellar Hacks: Agents 2026</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Stellar Testnet
          </div>
        </div>
      </footer>
    </div>
  );
}
