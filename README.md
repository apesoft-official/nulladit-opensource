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


Aurora Covenant is only a proposal; see [AURORA-COVENANT.md](AURORA-COVENANT.md) for the client privilege boundary.

Developed by **Apesoft Canada** · **Inviolable Conversations**


The proposed [VESTIGIUM accountability contract](https://github.com/apesoft-official/nulladit-pelavium/blob/main/VESTIGIUM.md) is research-only and grants no access to protected data.

## VESTIGIUM — Evidence without surveillance

Read the [Doctrine of Evidentiary Restraint](VESTIGIUM-PHILOSOPHY.md). **Prove the violation, not the conversation.** VESTIGIUM is a proposed accountability doctrine, not a deployed surveillance or access mechanism.
