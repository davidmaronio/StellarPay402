import { NextRequest, NextResponse } from "next/server";
import { db, endpoints, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; endpointSlug: string }> }
) {
  const { userSlug, endpointSlug } = await params;

  const [user] = await db.select().from(users).where(eq(users.slug, userSlug)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.userId, user.id), eq(endpoints.slug, endpointSlug), eq(endpoints.active, true)))
    .limit(1);

  if (!endpoint) return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const proxyUrl = `${baseUrl}/${userSlug}/${endpointSlug}`;

  // MCP-compatible tool definition
  const mcpTool = {
    name: `${userSlug}_${endpointSlug}`.replace(/-/g, "_"),
    description: `${endpoint.name}${endpoint.description ? ` — ${endpoint.description}` : ""}. Costs $${endpoint.priceUsdc.toFixed(4)} USDC per request on Stellar testnet via x402.`,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional additional path to append to the API URL (e.g. '/v1/data')",
        },
        query: {
          type: "string",
          description: "Optional query string to append (e.g. '?city=London&units=metric')",
        },
      },
    },
    x402: {
      proxyUrl,
      priceUsdc:  endpoint.priceUsdc,
      network:    "stellar:testnet",
      payTo:      endpoint.stellarAddress,
      asset:      "USDC",
    },
    // Claude Desktop / Cursor MCP server config snippet.
    // The stellarpay402 MCP server auto-discovers every endpoint in the
    // marketplace as a tool — you only register the server once, not per
    // endpoint. No clone or install required — npx fetches the published
    // package from npm on first run.
    mcpServerConfig: {
      stellarpay402: {
        command: "npx",
        args:    ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
        env: {
          STELLAR_SECRET_KEY:   "<YOUR_STELLAR_TESTNET_SECRET_KEY>",
          MARKETPLACE_URL:      baseUrl,
          MAX_USDC_PER_SESSION: "0.50",
        },
      },
    },
  };

  return NextResponse.json(mcpTool, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
