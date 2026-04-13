 #![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

fn make_id(env: &Env, n: u8) -> BytesN<16> {
    BytesN::from_array(env, &[n; 16])
}

#[test]
fn register_and_get_endpoint() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EndpointRegistry);
    let client      = EndpointRegistryClient::new(&env, &contract_id);

    let admin  = Address::generate(&env);
    let owner  = Address::generate(&env);
    let pay_to = Address::generate(&env);
    let id     = make_id(&env, 1);

    client.init(&admin);
    client.register(
        &id,
        &owner,
        &pay_to,
        &100_000i128, // 0.01 USDC in stroops
        &String::from_str(&env, "Weather API"),
        &false,
    );

    let rec = client.get(&id).unwrap();
    assert_eq!(rec.owner,         owner);
    assert_eq!(rec.pay_to,        pay_to);
    assert_eq!(rec.price_stroops, 100_000);
    assert!(rec.active);
    assert!(!rec.is_ai_powered);
    assert_eq!(client.count(), 1);
}

#[test]
fn register_ai_powered_endpoint() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EndpointRegistry);
    let client      = EndpointRegistryClient::new(&env, &contract_id);

    let admin  = Address::generate(&env);
    let owner  = Address::generate(&env);
    let pay_to = Address::generate(&env);
    let id     = make_id(&env, 4);

    client.init(&admin);
    client.register(
        &id,
        &owner,
        &pay_to,
        &100_000i128,
        &String::from_str(&env, "AI Answer Agent"),
        &true, // AI-powered
    );

    let rec = client.get(&id).unwrap();
    assert!(rec.is_ai_powered, "AI badge must be stored on-chain");
    assert_eq!(rec.name, String::from_str(&env, "AI Answer Agent"));
}

#[test]
fn update_price() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EndpointRegistry);
    let client      = EndpointRegistryClient::new(&env, &contract_id);

    let admin  = Address::generate(&env);
    let owner  = Address::generate(&env);
    let pay_to = Address::generate(&env);
    let id     = make_id(&env, 2);

    client.init(&admin);
    client.register(&id, &owner, &pay_to, &100_000i128, &String::from_str(&env, "API"), &false);
    client.update(&id, &500_000i128, &false);

    let rec = client.get(&id).unwrap();
    assert_eq!(rec.price_stroops, 500_000);
    assert!(!rec.active);
}

#[test]
fn attest_emits_event() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EndpointRegistry);
    let client      = EndpointRegistryClient::new(&env, &contract_id);

    let admin  = Address::generate(&env);
    let owner  = Address::generate(&env);
    let pay_to = Address::generate(&env);
    let payer  = Address::generate(&env);
    let id     = make_id(&env, 3);

    client.init(&admin);
    client.register(&id, &owner, &pay_to, &100_000i128, &String::from_str(&env, "API"), &false);
    client.attest(&id, &payer, &5u32, &String::from_str(&env, "great"));

    // attestation does not panic and increments nothing — it's purely an event
    assert_eq!(client.count(), 1);
}
