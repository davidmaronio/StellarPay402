# @davidmaronio/stellarpay402-mcp

A Model Context Protocol (MCP) server that exposes every endpoint in a running StellarPay402 marketplace as a tool to any MCP-aware AI assistant. When the assistant invokes a tool, the server signs an x402 payment with its configured Stellar testnet key, submits it to the proxy, and returns the API response to the model.

## Installation

The package is published on the public npm registry. There is nothing to install — `npx` fetches it on first run:

```bash
npx -y @davidmaronio/stellarpay402-mcp@latest
```

For development you can also clone the parent [StellarPay402](https://github.com/davidmaronio/StellarPay402) repository and run the source directly:

```bash
cd StellarPay402/mcp-server
npm install
node index.mjs
```

## Configuration

The server reads configuration from environment variables.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `STELLAR_SECRET_KEY` | yes | — | Stellar testnet secret key (`S...`). Used to sign x402 payments. |
| `MARKETPLACE_URL` | no | `http://localhost:3000` | Base URL of the StellarPay402 marketplace. |
| `MAX_USDC_PER_SESSION` | no | `0.50` | Client-side spending cap per session. The server refuses to sign any payment that would push cumulative spend past this value. |

### Obtaining a testnet wallet

1. Visit <https://laboratory.stellar.org/#account-creator?network=test>.
2. Generate a new keypair and record the secret key.
3. Click **Fund account with Friendbot** to credit it with test XLM.
4. Add a trustline for USDC: asset code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
5. Swap a small amount of XLM for USDC on the testnet DEX.

## Claude Desktop

Add the following block to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your platform:

```json
{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY": "S...",
        "MARKETPLACE_URL": "https://stellarpay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}
```

Restart Claude Desktop. Every public endpoint in the marketplace will appear as a tool with a name of the form `{userSlug}_{endpointSlug}`.

## Behaviour

On startup the server connects over stdio, logs its configuration to stderr, and waits for MCP requests.

On `tools/list` it fetches `${MARKETPLACE_URL}/api/marketplace` and returns one tool per endpoint. Tool descriptions include the provider name and the USDC price per call.

On `tools/call`:

1. The server performs an unauthenticated request to the endpoint and expects a 402 response containing x402 payment requirements.
2. It checks that the resulting price would not exceed the remaining session budget. If it would, the tool call fails with a budget error.
3. It builds and signs an x402 payment payload using `@x402/stellar` and the configured secret key.
4. It retries the request with the `X-PAYMENT` header.
5. It returns the response body to the model, prefixed with a summary that includes the USDC amount paid, the cumulative session spend, and a link to the settled transaction on Stellar Expert.

## Tool output format

```
✓ Paid 0.0100 USDC on Stellar testnet
  Payment proof: https://stellar.expert/explorer/testnet/tx/<hash>
  Session spend: 0.0100 / 0.5000 USDC

── API Response ──
<body returned by the upstream API>
```

## Budget enforcement

Session budget is enforced on the client side only. The marketplace proxy has its own, independent per-payer hourly spending cap; see the main repository README.

## License

MIT
