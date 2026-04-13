# endpoint_registry

A Soroban smart contract that saves every endpoint listed on [StellarPay402](https://github.com/davidmaronio/StellarPay402) on chain. It also records reputation attestations from payers.

The contract does not hold funds. It does not take part in payment settlement. x402 settlement happens off chain through the facilitator. The job of this contract is to give the marketplace catalog an immutable on chain trail. If the hosted marketplace ever goes away, you can rebuild the full set of registered endpoints from Stellar event logs.

## Functions

| Function | Auth | What it does |
| --- | --- | --- |
| `init(admin)` | admin | One time setup. Stores the admin address. |
| `register(endpoint_id, owner, pay_to, price_stroops, name, is_ai_powered)` | owner | Registers a new endpoint. Fails if `endpoint_id` already exists or if `price_stroops <= 0`. `is_ai_powered` is stored in the record and emitted in the `reg` event. |
| `update(endpoint_id, new_price_stroops, active)` | owner | Updates the price and active flag on an existing endpoint. |
| `attest(endpoint_id, payer, rating, comment)` | none | Saves an on chain reputation note. `rating` must be `1..=5`. No auth required — the paid x402 call acts as the spam filter. |
| `get(endpoint_id)` | none | Returns `Option<EndpointRecord>`. Read only. |
| `count()` | none | Returns the total number of endpoints ever registered. |

## Events

The contract emits short symbol events to stay within Soroban symbol length limits.

| Topic | Data | Emitted by |
| --- | --- | --- |
| `("reg", endpoint_id)` | `(owner, pay_to, price_stroops, name, is_ai_powered)` | `register` |
| `("upd", endpoint_id)` | `(new_price_stroops, active)` | `update` |
| `("att", endpoint_id, payer)` | `(rating, comment)` | `attest` |

An off chain indexer can rebuild the full marketplace state by replaying `reg` and `upd` events in order.

## Storage

Persistent storage:

- `DataKey::Endpoint(BytesN<16>)` to `EndpointRecord`

Instance storage:

- `DataKey::Admin` to `Address`
- `DataKey::EndpointCount` to `u32`

`EndpointRecord` is a `contracttype` struct with `owner`, `pay_to`, `price_stroops`, `name`, `active`, `is_ai_powered`, and `created_ledger`.

## Build

Install the Rust toolchain and the Soroban WASM target. Then run:

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

The compiled contract lands at `target/wasm32-unknown-unknown/release/endpoint_registry.wasm`.

## Test

```bash
cargo test
```

The test module covers registration (including `is_ai_powered` flag), AI-powered endpoint badge, price updates, and attestation emission. It uses `soroban-sdk`'s `mock_all_auths` helper. All 4 tests pass.

## Deploy to Stellar testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/endpoint_registry.wasm \
  --source <your-testnet-key-alias> \
  --network testnet
```

Save the contract ID it prints. Initialize the admin:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <your-testnet-key-alias> \
  --network testnet \
  -- init --admin <ADMIN_ADDRESS>
```

Set the environment variables in the parent app:

```env
REGISTRY_CONTRACT_ID=<CONTRACT_ID>
REGISTRY_SUBMITTER_SECRET=<secret-key-that-pays-fees>
```

### Live contract (Stellar testnet)

```
CCCCETOWJQQPIGRKSJW7M4ULM7MBKIVTIRLA7NJTVSGR3XG2KSZZXYA7
```

Notable design decisions:
- `attest()` has no `require_auth()` guard. The marketplace proxy submits attestations with the caller's real Stellar G-address for attribution. The economic cost of the preceding x402 call acts as the spam filter. Rating range is `1..=5`.
- `is_ai_powered` is part of `EndpointRecord` and included in the `reg` event. This lets agents and indexers identify AI-generated endpoints from the event log alone, without querying storage.
- The current deployed contract (`CCCCETOW...XYA7`) pre-dates the `is_ai_powered` field. The updated contract source is in this repo. Redeploy and update `REGISTRY_CONTRACT_ID` to activate on-chain AI badge anchoring. Until then, `is_ai_powered` is stored in Postgres only; `attest`, `get`, and `count` are unaffected.

Once these variables are set, every new endpoint created through the StellarPay402 dashboard automatically emits a `reg` event on this contract.

## License

MIT
