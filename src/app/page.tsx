"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Globe,
  Bot,
  Store,
  FilePlus2,
  Anchor,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { LampContainer } from "@/components/ui/lamp";
import RadialOrbitalTimeline, {
  type TimelineItem,
} from "@/components/ui/radial-orbital-timeline";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const flowData: TimelineItem[] = [
  {
    id: 1,
    title: "List your API",
    date: "Step 1",
    content:
      "Paste your HTTPS API URL into the dashboard and set a USDC price per request. You get a paid proxy URL back. No code on your side.",
    category: "Owner",
    icon: FilePlus2,
    relatedIds: [2],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "Anchor on Soroban",
    date: "Step 2",
    content:
      "Every endpoint emits a register event on the EndpointRegistry Soroban contract. The catalog has an on chain trail even if the marketplace goes down.",
    category: "On chain",
    icon: Anchor,
    relatedIds: [1, 3],
    status: "completed",
    energy: 95,
  },
  {
    id: 3,
    title: "Agent discovers tool",
    date: "Step 3",
    content:
      "Any MCP client (Claude Desktop, Cursor, Cline) loads @davidmaronio/stellarpay402-mcp and sees every public endpoint as a tool with the price baked in.",
    category: "MCP",
    icon: Bot,
    relatedIds: [2, 4],
    status: "completed",
    energy: 100,
  },
  {
    id: 4,
    title: "Sign x402 payment",
    date: "Step 4",
    content:
      "When the AI calls a tool, the MCP server signs an x402 payment with its configured Stellar wallet. No human approval. The session budget cap stops runaway spend.",
    category: "x402",
    icon: Wallet,
    relatedIds: [3, 5],
    status: "completed",
    energy: 95,
  },
  {
    id: 5,
    title: "Settle on Stellar",
    date: "Step 5",
    content:
      "USDC moves on Stellar testnet in seconds. The proxy returns the upstream API response with a Stellar Expert link. The payment shows up on the public receipts page.",
    category: "Settlement",
    icon: CircleDollarSign,
    relatedIds: [4, 1],
    status: "completed",
    energy: 100,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
              S
            </div>
            <span className="font-semibold text-sm">StellarPay402</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/marketplace"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/login"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-1.5 rounded-lg transition-colors font-semibold"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero with Lamp */}
      <LampContainer className="-mt-14">
        <motion.div
          initial={{ opacity: 0.3, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 text-xs text-cyan-300 font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
            x402 protocol on Stellar testnet
          </div>

          <h1 className="bg-gradient-to-br from-slate-100 to-slate-400 py-2 bg-clip-text text-center text-4xl font-semibold tracking-tight text-transparent md:text-6xl">
            Where AI agents
            <br />
            pay for APIs
          </h1>

          <p className="mt-6 max-w-xl text-center text-sm md:text-base text-slate-400 leading-relaxed">
            List a paid HTTP API in one screen. Any MCP client signs x402
            payments and calls it. USDC settles on Stellar in five seconds.
            Every endpoint is anchored on chain by a Soroban contract.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Store size={15} /> Browse marketplace
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-slate-200 hover:text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              List your API <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>
      </LampContainer>

      {/* Orbital flow section */}
      <section className="relative bg-slate-950">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-4 text-center">
          <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            From listing to settlement in five steps
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Click any node to see what happens at that step. Every node below
            is live in production.
          </p>
        </div>

        <RadialOrbitalTimeline timelineData={flowData} />
      </section>

      {/* Code preview */}
      <section className="max-w-3xl mx-auto px-5 py-20">
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">
              Agent to Agent payments
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Any AI agent (Claude, GPT, or your own) can browse the marketplace,
            pick an endpoint, and call it. Payment in USDC happens automatically
            on Stellar. No wallets to connect by hand. No subscriptions. Just
            HTTP and x402.
          </p>
          <div className="bg-slate-950 border border-white/5 rounded-lg p-4 font-mono text-xs">
            <div className="text-slate-600 mb-1">
              {"# An agent calls a paid endpoint. Payment is automatic."}
            </div>
            <div className="text-cyan-400">{`curl ${appUrl}/n4buhayk/weather \\`}</div>
            <div className="text-cyan-400 pl-4">
              {"-H 'X-PAYMENT: <base64 x402 payload>'"}
            </div>
            <div className="text-slate-500 mt-2">
              {"-> HTTP 200  X-Payment-Receipt: <stellar tx hash>"}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            {
              icon: Store,
              title: "Public marketplace",
              desc: "Browse every listed API. Search, filter, and copy the MCP config with one click.",
            },
            {
              icon: Bot,
              title: "MCP native",
              desc: "Every endpoint ships a tool definition any MCP client can drop straight into its toolbox.",
            },
            {
              icon: Zap,
              title: "x402 native",
              desc: "HTTP 402 Payment Required. The open standard for machine readable API payments.",
            },
            {
              icon: Globe,
              title: "Zero code",
              desc: "No SDK, no middleware. Just a URL. Works with any HTTP API out of the box.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-slate-900/40 border border-white/5 rounded-xl p-5 hover:border-cyan-500/30 transition-colors"
            >
              <f.icon size={18} className="text-cyan-400 mb-3" />
              <h3 className="font-semibold text-sm text-white mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between text-xs text-slate-600">
          <span>StellarPay402 for Stellar Hacks: Agents 2026</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
            Stellar Testnet
          </div>
        </div>
      </footer>
    </div>
  );
}
