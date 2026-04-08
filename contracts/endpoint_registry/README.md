# endpoint_registry

A Soroban smart contract that anchors every endpoint listed on [StellarPay402](https://github.com/davidmaronio/StellarPay402) on-chain and records payer reputation attestations.

The contract does not hold funds and does not participate in payment settlement — x402 settlements happen off-chain via the facilitator. Its purpose is to provide an immutable provenance trail for the marketplace catalog: even if the hosted marketplace disappears, the set of registered endpoints and their current prices can be reconstructed from Stellar event logs.

## Contract interface

| Function | Auth | Description |
| --- | --- | --- |
| `init(admin)` | admin | One-time initialization. Stores the admin address for future administrative use. |
| `register(endpoint_id, owner, pay_to, price_stroops, name)` | owner | Registers a new endpoint. Fails if `endpoint_id` is already registered or if `price_stroops <= 0`. |
| `update(endpoint_id, new_price_stroops, active)` | owner | Updates the price and active flag of an existing endpoint. |
| `attest(endpoint_id, payer, rating, comment)` | payer | Records an on-chain reputation attestation. `rating` must be in `0..=5`. |
| `get(endpoint_id) -> Option<EndpointRecord>` | — | Read-only accessor. |
| `count() -> u32` | — | Returns the total number of endpoints ever registered. |

## Events

The contract emits the following events, all keyed by short symbols to stay within Soroban symbol length limits:

| Topic | Data | Emitted by |
| --- | --- | --- |
| `("reg", endpoint_id)` | `(owner, pay_to, price_stroops, name)` | `register` |
| `("upd", endpoint_id)` | `(new_price_stroops, active)` | `update` |
| `("att", endpoint_id, payer)` | `(rating, comment)` | `attest` |

An off-chain indexer can rebuild the full marketplace state by replaying `reg` and `upd` events in order.

## Storage

Persistent storage keys:

- `DataKey::Endpoint(BytesN<16>)` → `EndpointRecord`

Instance storage keys:

- `DataKey::Admin` → `Address`
- `DataKey::EndpointCount` → `u32`

`EndpointRecord` is a `contracttype` struct containing `owner`, `pay_to`, `price_stroops`, `name`, `active`, and `created_ledger`.

## Build

Install the Rust toolchain and the Soroban WASM target, then build:

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

The compiled contract will be at `target/wasm32-unknown-unknown/release/endpoint_registry.wasm`.

## Test

```bash
cargo test
```

The test module covers registration, price updates, and attestation emission using `soroban-sdk`'s `mock_all_auths` utilities.

## Deploy to Stellar testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/endpoint_registry.wasm \
  --source <your-testnet-key-alias> \
  --network testnet
```

Save the returned contract ID, initialize the admin, and set the environment variables in the parent application:

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <your-testnet-key-alias> \
  --network testnet \
  -- init --admin <ADMIN_ADDRESS>
```

```env
REGISTRY_CONTRACT_ID=<CONTRACT_ID>
REGISTRY_SUBMITTER_SECRET=<secret-key-that-pays-fees>
```

Once these variables are set, every new endpoint created through the StellarPay402 dashboard will automatically emit a `reg` event on this contract.

## License

MIT
