#![no_std]
//! StellarPay402 — EndpointRegistry
//! ---------------------------------
//! On-chain registry that anchors every API endpoint listed on
//! StellarPay402. The off-chain marketplace verifies its catalog against
//! these emitted events; agents can independently audit which endpoints
//! exist, who owns them, and how their pricing has changed over time.
//!
//! This contract is intentionally tiny — it does *not* hold funds and
//! does *not* settle payments. Settlement happens off-chain via the x402
//! facilitator. The registry is the trust anchor: it gives every entry
//! in the marketplace an immutable on-chain provenance trail.
//!
//! Events emitted (keys are short symbols, x402 conventions):
//!   ("reg", endpoint_id)        → (owner, payTo, price_stroops)
//!   ("upd", endpoint_id)        → (price_stroops_new, active)
//!   ("att", endpoint_id, payer) → (rating_u32, comment_string)

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct EndpointRecord {
    pub owner:          Address,
    pub pay_to:         Address,
    pub price_stroops:  i128,   // USDC in stroops (7 decimals)
    pub name:           String,
    pub active:         bool,
    pub created_ledger: u32,
}

#[contracttype]
pub enum DataKey {
    Endpoint(BytesN<16>),    // endpoint_id (UUID bytes)
    Admin,
    EndpointCount,
}

#[contract]
pub struct EndpointRegistry;

#[contractimpl]
impl EndpointRegistry {
    /// One-time initialization. Sets the admin address that may
    /// administer global parameters in the future.
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EndpointCount, &0u32);
    }

    /// Register a new endpoint on-chain. Anyone may call this; the
    /// caller becomes the owner and must authorize the call.
    pub fn register(
        env:          Env,
        endpoint_id:  BytesN<16>,
        owner:        Address,
        pay_to:       Address,
        price_stroops: i128,
        name:         String,
    ) {
        owner.require_auth();
        if price_stroops <= 0 {
            panic!("price must be positive");
        }
        if env.storage().persistent().has(&DataKey::Endpoint(endpoint_id.clone())) {
            panic!("endpoint already registered");
        }

        let record = EndpointRecord {
            owner:          owner.clone(),
            pay_to:         pay_to.clone(),
            price_stroops,
            name:           name.clone(),
            active:         true,
            created_ledger: env.ledger().sequence(),
        };
        env.storage().persistent().set(&DataKey::Endpoint(endpoint_id.clone()), &record);

        // Bump the global counter
        let mut count: u32 = env.storage().instance().get(&DataKey::EndpointCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::EndpointCount, &count);

        // Emit registration event — agents and indexers listen for this
        env.events().publish(
            (symbol_short!("reg"), endpoint_id),
            (owner, pay_to, price_stroops, name),
        );
    }

    /// Update price or activation status. Only the owner may call.
    pub fn update(
        env:               Env,
        endpoint_id:       BytesN<16>,
        new_price_stroops: i128,
        active:            bool,
    ) {
        let mut record: EndpointRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Endpoint(endpoint_id.clone()))
            .expect("endpoint not found");

        record.owner.require_auth();
        if new_price_stroops <= 0 {
            panic!("price must be positive");
        }
        record.price_stroops = new_price_stroops;
        record.active        = active;
        env.storage().persistent().set(&DataKey::Endpoint(endpoint_id.clone()), &record);

        env.events().publish(
            (symbol_short!("upd"), endpoint_id),
            (new_price_stroops, active),
        );
    }

    /// A payer publishes an on-chain attestation about an endpoint they
    /// have called. Used for trustless reputation. The payer authorizes
    /// the call so spam is rate-limited by gas costs.
    pub fn attest(
        env:         Env,
        endpoint_id: BytesN<16>,
        payer:       Address,
        rating:      u32,
        comment:     String,
    ) {
        payer.require_auth();
        if rating > 5 {
            panic!("rating must be 0..=5");
        }
        if !env.storage().persistent().has(&DataKey::Endpoint(endpoint_id.clone())) {
            panic!("endpoint not found");
        }

        env.events().publish(
            (symbol_short!("att"), endpoint_id, payer),
            (rating, comment),
        );
    }

    /// Read the on-chain record for an endpoint.
    pub fn get(env: Env, endpoint_id: BytesN<16>) -> Option<EndpointRecord> {
        env.storage().persistent().get(&DataKey::Endpoint(endpoint_id))
    }

    /// Total number of endpoints ever registered.
    pub fn count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::EndpointCount).unwrap_or(0)
    }
}

mod test;
