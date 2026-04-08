# @davidmaronio/stellarpay402-mcp

A Model Context Protocol (MCP) server. It exposes every endpoint in a running StellarPay402 marketplace as a tool to any MCP-aware AI assistant. When the AI calls a tool, the server signs an x402 payment with its configured Stellar testnet key, sends it to the proxy, and returns the API response.

## Install

The package is on the public npm registry. There is nothing to install yourself. `npx` fetches it on first run:

```bash
npx -y @davidmaronio/stellarpay402-mcp@latest
```

If you want to hack on the source, clone the parent repo and run it directly:

```bash
cd StellarPay402/mcp-server
npm install
node index.mjs
```

## Configuration

The server reads everything from environment variables.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `STELLAR_SECRET_KEY` | yes | none | Stellar testnet secret key (`S...`). Used to sign x402 payments. |
| `MARKETPLACE_URL` | no | `https://stellar-pay402.vercel.app` | Base URL of the StellarPay402 marketplace. Use `http://localhost:3000` if you are running the marketplace locally. |
| `MAX_USDC_PER_SESSION` | no | `0.50` | Spending cap per session, enforced by the client. The server refuses any payment that would push your cumulative spend past this. |

### Get a testnet wallet

1. Open <https://laboratory.stellar.org/#account-creator?network=test>.
2. Generate a new keypair. Save the secret key.
3. Click "Fund account with Friendbot" to credit it with test XLM.
4. Add a trustline for USDC. Asset code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
5. Swap a small amount of XLM for USDC on the testnet DEX.

## Claude Desktop

Add this block to `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or the equivalent path on your platform:

```json
{
  "mcpServers": {
    "stellarpay402": {
      "command": "npx",
      "args": ["-y", "@davidmaronio/stellarpay402-mcp@latest"],
      "env": {
        "STELLAR_SECRET_KEY": "S...",
        "MARKETPLACE_URL": "https://stellar-pay402.vercel.app",
        "MAX_USDC_PER_SESSION": "0.50"
      }
    }
  }
}
```

Restart Claude Desktop. Every public endpoint in the marketplace shows up as a tool named `{userSlug}_{endpointSlug}`.

## How it behaves

On startup, the server connects over stdio, logs its config to stderr, and waits for MCP requests.

On `tools/list`:

1. It fetches `${MARKETPLACE_URL}/api/marketplace`.
2. It returns one tool per endpoint.
3. Tool descriptions include the provider name and the USDC price per call.

On `tools/call`:

1. The server hits the endpoint with no payment header. It expects a 402 response with x402 payment requirements.
2. It checks the price against the remaining session budget. If the call would exceed the budget, it fails with a budget error.
3. It builds and signs an x402 payment payload with `@x402/stellar` and the configured secret key.
4. It retries the request with the `X-PAYMENT` header.
5. It returns the response body to the model. The response starts with a summary that includes the USDC amount paid, the cumulative session spend, and a link to the settled transaction on Stellar Expert.

## Output format

```
Paid 0.0100 USDC on Stellar testnet
Payment proof: https://stellar.expert/explorer/testnet/tx/<hash>
Session spend: 0.0100 / 0.5000 USDC

API Response
<body returned by the upstream API>
```

## Spending cap

The session budget runs on the client side only. The marketplace proxy has its own per-payer hourly cap on the server side. See the main repository README.

## License

MIT
