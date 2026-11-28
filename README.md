# NOMC — NULLADIT Open Source Messenger Client

**One network · Many independent messengers**

A network should not require its participants to depend on one vendor's interface. NOMC is the public client development surface for independently built messenger applications, websites and client-only device installers that communicate over the same NULLADIT protocol.

## Developer pathways
- Rebuild updated device installers for supported platforms from a clean public checkout.
- Host an independent website or build a standalone application using versioned public interfaces.
- Verify network configuration, authentication, encryption compatibility and messaging behavior without access to private infrastructure.

## Trust boundary
Client software must not contain proprietary node binaries, private administration, credentials or privileged services. Official signed releases and independent builds must be distinguishable. NODSEL is the deployed-encryption reference; PELAVIUM is not a production dependency.

## Build and release evidence
Publish dependency locks, platform support, build instructions, protocol versions, hashes and test results as they become verified. This README does not establish that every target is currently buildable or interoperable.

All contributions follow the [engineering constitution](CONSTITUTION.md).

## The architecture of trust
Privacy is not a privilege conferred by an intermediary. NULLADIT seeks to make confidential communication an architectural property rather than a promise of institutional discretion. Independent operation, verifiable cryptography and interoperable clients are complementary goals, not substitutes for security review. No system is invulnerable; claims must follow evidence.

| Project | Responsibility |
| --- | --- |
| NULLADIT Core | Proprietary protocol and node operations; private repository |
| [NOMC](https://github.com/apesoft-official/nulladit-opensource-messenger-client) | Public messenger clients, device installers and independent web/app builds |
| [NODSEL](https://github.com/apesoft-official/nulladit-deployed-open-source-encryption-logic) | Public transparency for actual deployed encryption revisions |
| [PELAVIUM](https://github.com/apesoft-official/nulladit-pelavium) | Experimental privacy research, not deployed |


Aurora graph deployment was reported on November 27, 2026, without verified production integration; see [AURORA-COVENANT.md](AURORA-COVENANT.md) for the client privilege boundary.

Developed by **Apesoft Canada** · **Inviolable Conversations**


The proposed [VESTIGIUM accountability contract](https://github.com/apesoft-official/nulladit-pelavium/blob/main/VESTIGIUM.md) is research-only and grants no access to protected data.

## VESTIGIUM — Evidence without surveillance

Read the [Doctrine of Evidentiary Restraint](VESTIGIUM-PHILOSOPHY.md). **Prove the violation, not the conversation.** VESTIGIUM is a proposed accountability doctrine, not a deployed surveillance or access mechanism.

## NULL22 representation and node rewards

See the [NULL22 Representation and Node Service Compensation policy](TOKEN-REPRESENTATION-AND-NODE-REWARDS.md). It records Apesoft's representation limits and the proposed opt-in Proof-of-Service reward standard; it does not determine legal classification or replace applicable valuation and reporting rules.


## NSELCBA client boundary

The Node Service Exchange Lawful Canadian Barter Attestation (NSELCBA) is a separate, research-only node-operator attestation. A standalone deployment was reported on November 28, 2026, without verified production integration. It is not part of NOMC sign-in, message delivery, recipient access, or client installation. See [the client compatibility boundary](docs/NSELCBA-COMPATIBILITY.md).

See [the consolidated deployment and whitepaper bulletin](WHITEPAPER-DEPLOYMENT-UPDATE-2026-11-28.md) for recorded addresses and evidence limitations. No mining or production activation is implied.
