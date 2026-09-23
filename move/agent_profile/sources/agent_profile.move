module agent_profile::agent_profile;

use std::string::String;
use std::vector;
use sui::object::{Self, ID, UID};
use sui::event;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct AgentProfileV2 has key, store {
    id: UID,
    owner: address,
    wallet: address,
    suins_name: String,
    memory_namespace: String,
    endpoint: String,
    version: String,
    skills: vector<String>,
}

/// Immutable registration snapshot. Metadata is a registrant claim, not proof of identity.
public struct AgentRegistered has copy, drop {
    profile_id: ID,
    owner: address,
    wallet: address,
    suins_name: String,
    memory_namespace: String,
    endpoint: String,
    version: String,
    skills: vector<String>,
}

const ENotOwner: u64 = 0;
const EWalletMismatch: u64 = 1;

/// Also announces pre-event V2 objects after a compatible upgrade.
/// Repeated announcements are allowed; indexers must upsert by profile ID.
public fun announce_v2(profile: &AgentProfileV2, ctx: &TxContext) {
    assert!(profile.owner == tx_context::sender(ctx), ENotOwner);
    emit_registration(profile);
}

fun emit_registration(profile: &AgentProfileV2) {
    event::emit(AgentRegistered {
        profile_id: object::id(profile),
        owner: profile.owner,
        wallet: profile.wallet,
        suins_name: profile.suins_name,
        memory_namespace: profile.memory_namespace,
        endpoint: profile.endpoint,
        version: profile.version,
        skills: profile.skills,
    });
}

public fun create_v2(
    wallet: address,
    suins_name: String,
    memory_namespace: String,
    endpoint: String,
    version: String,
    skills: vector<String>,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    // The wallet field must be proven, not merely claimed: only the transaction that
    // wallet itself signs may register it. Sui's own signature check on `sender` is the proof.
    assert!(wallet == sender, EWalletMismatch);

    let profile = AgentProfileV2 {
        id: object::new(ctx),
        owner: sender,
        wallet,
        suins_name,
        memory_namespace,
        endpoint,
        version,
        skills,
    };

    emit_registration(&profile);
    transfer::transfer(profile, sender);
}

public fun skills(profile: &AgentProfileV2): &vector<String> {
    &profile.skills
}

public fun skill_count(profile: &AgentProfileV2): u64 {
    vector::length(&profile.skills)
}

#[test_only]
public fun registration_profile_id(registration: &AgentRegistered): ID {
    registration.profile_id
}

#[test_only]
public fun registration_skills(registration: &AgentRegistered): &vector<String> {
    &registration.skills
}
