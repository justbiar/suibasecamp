#[test_only]
module agent_profile::agent_profile_tests;

use agent_profile::agent_profile::{Self, AgentProfileV2, AgentRegistered};
use std::unit_test::assert_eq;
use sui::{event, object, test_scenario, transfer};

fun create(wallet: address, ctx: &mut sui::tx_context::TxContext) {
    agent_profile::create_v2(wallet, b"example.sui".to_string(), b"example".to_string(),
        b"local://sui-local-agent".to_string(), b"2.0.0".to_string(),
        vector[b"get_balance".to_string()], ctx);
}

#[test]
fun creation_and_reannouncement_preserve_profile() {
    let mut scenario = test_scenario::begin(@0xA);
    create(@0xA, scenario.ctx());
    let events = event::events_by_type<AgentRegistered>();
    assert_eq!(events.length(), 1);
    assert_eq!(*agent_profile::registration_skills(&events[0]), vector[b"get_balance".to_string()]);
    let id = agent_profile::registration_profile_id(&events[0]);
    scenario.next_tx(@0xA);
    let profile = scenario.take_from_sender<AgentProfileV2>();
    assert_eq!(object::id(&profile), id);
    assert_eq!(agent_profile::skill_count(&profile), 1);
    agent_profile::announce_v2(&profile, scenario.ctx());
    let announced = event::events_by_type<AgentRegistered>();
    assert_eq!(announced.length(), 1);
    assert_eq!(agent_profile::registration_profile_id(&announced[0]), id);
    scenario.return_to_sender(profile);
    scenario.end();
}

#[test, expected_failure(abort_code = 1, location = agent_profile)]
fun registration_wallet_must_match_the_signer() {
    let mut scenario = test_scenario::begin(@0xA);
    create(@0xB, scenario.ctx());
    scenario.end();
}

#[test, expected_failure(abort_code = 0, location = agent_profile)]
fun transferred_profile_cannot_impersonate_original_registrant() {
    let mut scenario = test_scenario::begin(@0xA);
    create(@0xA, scenario.ctx());
    scenario.next_tx(@0xA);
    let profile = scenario.take_from_sender<AgentProfileV2>();
    transfer::public_transfer(profile, @0xC);
    scenario.next_tx(@0xC);
    let profile = scenario.take_from_sender<AgentProfileV2>();
    agent_profile::announce_v2(&profile, scenario.ctx());
    std::unit_test::destroy(profile);
    std::unit_test::destroy(scenario);
}
