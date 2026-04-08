"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Store,
  FilePlus2,
  Anchor,
  Bot,
  Wallet,
  CircleDollarSign,
  Star,
} from "lucide-react";
import { LampContainer } from "@/components/ui/lamp";
import { MarketingHeader } from "@/components/ui/marketing-header";
import RadialOrbitalTimeline, {
  type TimelineItem,
} from "@/components/ui/radial-orbital-timeline";

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
    relatedIds: [4, 6],
    status: "completed",
    energy: 100,
  },
  {
    id: 6,
    title: "Attest quality",
    date: "Step 6",
    content:
      "After every successful paid call, the proxy automatically anchors a 5-star attestation on the EndpointRegistry Soroban contract — tied to the real payer wallet. Reputation builds with every call, on chain, with no human in the loop.",
    category: "Reputation",
    icon: Star,
    relatedIds: [5, 1],
    status: "completed",
    energy: 90,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      {/* Hero with Lamp */}
      <LampContainer className="-mt-14">
        <motion.div
          initial={{ opacity: 0.3, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-3 py-1 text-xs text-secondary-foreground font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            Agent-to-agent · x402 · Stellar testnet
          </div>

          <h1 className="py-2 text-center text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            One agent sells.
            <br />
            <span className="text-primary">Another agent pays.</span>
          </h1>

          <p className="mt-5 max-w-xl text-center text-sm md:text-base text-foreground/85 leading-relaxed">
            The agent-to-agent API marketplace on Stellar. List any HTTP endpoint and set a USDC price.
            AI agents discover it via MCP, sign an x402 payment autonomously, and get the response —
            zero humans in the loop. Every call settles on chain in seconds.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Store size={15} /> Browse marketplace
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 border border-border hover:border-border/80 text-foreground/80 hover:text-foreground font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              List your API <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>
      </LampContainer>

      {/* Orbital flow */}
      <section id="how-it-works" className="relative bg-background scroll-mt-20">
        <div className="max-w-5xl mx-auto px-5 pt-14 pb-2 text-center">
          <p className="text-xs text-primary font-mono uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            From listing to settlement in five steps
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Click any node to see what happens at that step. Every node is
            live in production.
          </p>
        </div>
        <RadialOrbitalTimeline timelineData={flowData} />
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between text-xs text-muted-foreground/70">
          <span>StellarPay402 for Stellar Hacks: Agents 2026</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            Stellar Testnet
          </div>
        </div>
      </footer>
    </div>
  );
}
