#!/usr/bin/env node
/**
 * stellarpay402 CLI
 * Register any API endpoint on the StellarPay402 marketplace in seconds.
 *
 * Usage:
 *   npx stellarpay402 register --url https://myapi.com/data --price 0.001 --key sp402_xxx
 *   npx stellarpay402 register --url https://myapi.com/data --price 0.001 --name "My API" --stellar G... --key sp402_xxx
 */

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE_URL = "https://stellar-pay402.vercel.app";
const CONFIG_PATH = join(homedir(), ".stellarpay402.json");

// ── Colours ───────────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  green: "\x1b[32m",
  cyan:  "\x1b[36m",
  red:   "\x1b[31m",
  dim:   "\x1b[2m",
};

function ok(msg)   { console.log(`${c.green}✓${c.reset} ${msg}`); }
function err(msg)  { console.error(`${c.red}✗${c.reset} ${msg}`); }
function info(msg) { console.log(`${c.cyan}→${c.reset} ${msg}`); }
function dim(msg)  { console.log(`${c.dim}${msg}${c.reset}`); }

// ── Config (saves API key locally) ───────────────────────────────────────────
function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try { return JSON.parse(readFileSync(CONFIG_PATH, "utf8")); } catch { return {}; }
  }
  return {};
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdRegister(args) {
  const { values } = parseArgs({
    args,
    options: {
      url:     { type: "string" },
      price:   { type: "string" },
      name:    { type: "string" },
      slug:    { type: "string" },
      stellar: { type: "string" },
      desc:    { type: "string" },
      ai:      { type: "boolean" },
      key:     { type: "string" },
    },
    strict: false,
  });

  const cfg = loadConfig();
  const apiKey = values.key || cfg.apiKey;

  if (!apiKey) {
    err("No API key found. Get yours at " + BASE_URL + "/dashboard → API Key");
    err("Then run: npx stellarpay402 login --key sp402_xxx");
    process.exit(1);
  }

  if (!values.url) { err("--url is required (the URL of your API endpoint)"); process.exit(1); }
  if (!values.price) { err("--price is required (USDC per request, e.g. 0.001)"); process.exit(1); }

  // Derive defaults
  const url   = values.url;
  const price = parseFloat(values.price);
  const name  = values.name  || new URL(url).hostname;
  const slug  = values.slug  || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  const stellar = values.stellar || cfg.stellarAddress;

  if (!stellar) {
    err("--stellar G... is required (your Stellar address to receive payments)");
    err("Or save it once: npx stellarpay402 login --key sp402_xxx --stellar G...");
    process.exit(1);
  }

  console.log();
  console.log(`${c.bold}Registering on StellarPay402${c.reset}`);
  dim(`  Endpoint: ${url}`);
  dim(`  Price:    $${price} USDC per request`);
  dim(`  Stellar:  ${stellar}`);
  console.log();

  const res = await fetch(`${BASE_URL}/api/v1/register`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name,
      slug,
      targetUrl:    url,
      priceUsdc:    price,
      stellarAddress: stellar,
      description:  values.desc,
      isAiPowered:  Boolean(values.ai),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    err(data.error || "Registration failed");
    process.exit(1);
  }

  ok(`${c.bold}Endpoint registered!${c.reset}`);
  console.log();
  console.log(`  Proxy URL:  ${c.cyan}${data.endpoint.proxyUrl}${c.reset}`);
  console.log(`  Price:      $${data.endpoint.priceUsdc} USDC per request`);
  if (data.endpoint.onChainTxHash) {
    console.log(`  On-chain:   https://stellar.expert/explorer/testnet/tx/${data.endpoint.onChainTxHash}`);
  }
  console.log();
  console.log(`  Marketplace: ${BASE_URL}/marketplace`);
  console.log();
  info("Buyers can now call your endpoint and pay in USDC on Stellar — no API keys needed.");
  console.log();
}

async function cmdLogin(args) {
  const { values } = parseArgs({
    args,
    options: {
      key:     { type: "string" },
      stellar: { type: "string" },
    },
    strict: false,
  });

  if (!values.key) {
    err("--key is required. Get your API key at " + BASE_URL + "/dashboard");
    process.exit(1);
  }

  const cfg = loadConfig();
  cfg.apiKey = values.key;
  if (values.stellar) cfg.stellarAddress = values.stellar;
  saveConfig(cfg);

  ok(`API key saved to ${CONFIG_PATH}`);
  if (values.stellar) ok(`Stellar address saved: ${values.stellar}`);
}

function cmdHelp() {
  console.log(`
${c.bold}stellarpay402${c.reset} — Register your API on the StellarPay402 marketplace

${c.bold}Commands:${c.reset}

  ${c.cyan}login${c.reset}     Save your API key locally
  ${c.cyan}register${c.reset}  Register an API endpoint on the marketplace

${c.bold}Usage:${c.reset}

  ${c.dim}# Save your key once${c.reset}
  npx stellarpay402 login --key sp402_xxx --stellar GXXXXXXX...

  ${c.dim}# Register an endpoint${c.reset}
  npx stellarpay402 register --url https://myapi.com/data --price 0.001

  ${c.dim}# All options${c.reset}
  npx stellarpay402 register \\
    --url https://myapi.com/data \\
    --price 0.001 \\
    --name "My Data API" \\
    --stellar GXXXXXXX... \\
    --desc "Returns live market data" \\
    --ai

${c.bold}Get your API key:${c.reset}
  ${BASE_URL}/dashboard → API Key tab
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const [,, command, ...rest] = process.argv;

switch (command) {
  case "register": await cmdRegister(rest); break;
  case "login":    await cmdLogin(rest);    break;
  case "help":
  case "--help":
  case "-h":
  default:         cmdHelp();              break;
}
