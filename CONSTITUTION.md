# NOMC coding constitution
## Scope
NOMC is the public NULLADIT messenger client. Developers may build, modify and distribute compatible client apps and client-only installers using documented public network interfaces. A client installer must not bundle proprietary node executables or source. Official node software is distributed separately through authorized channels.
## Non-negotiable boundaries
- Never copy private repository code, internal administrative dashboards, privileged APIs, deployment credentials, signing keys, tunnel tokens, private configuration, user data or production secrets into this repository, build artifacts, logs or history.
- Use only documented public protocol interfaces and approved public dependencies. NODSEL is the designated deployed encryption reference; PELAVIUM is separate experimental research and must not silently replace deployed encryption.
- Authenticate network identity and endpoints using verified public configuration; do not hardcode unverified addresses, disable TLS validation, bypass wallet consent, weaken cryptography or silently downgrade protocol versions.
- Keep keys local where required by the protocol; never request seed phrases or private keys. Minimize permissions, telemetry and retained personal data.
- Client code must not grant administrative, governance, mining or node privileges. Enforce authorization at the network boundary, not merely in UI controls.
## Release gates
- Review every changed file and dependency for licensing, secret leakage and private-code provenance. Use an explicit public-file allowlist; never export an entire private tree.
- Build from clean public checkout with pinned dependencies; test interoperability, authentication, failure handling and installer upgrade/uninstall behavior. Scan source, history and packaged artifacts for secrets and proprietary material before release.
- Publish hashes, source revision, dependency inventory and build instructions; distinguish official signed releases from independent builds. Do not bypass OS security warnings.
- Require human review for protocol, cryptography, permissions, network configuration and release-pipeline changes. Stop publication when provenance or security is uncertain.
- Do not claim a working installer or verified network compatibility without evidence. Report vulnerabilities privately through an authorized security contact before public disclosure of exploitable details.

## Mandatory dual-target maintenance sweep
Every relevant client, protocol, encryption, installer or release change must trigger a NOMC compatibility review and, where needed, synchronized public client updates. Maintain BOTH (1) reproducible updated client-only device installers for supported platforms and (2) independently buildable and deployable websites and standalone messenger apps using the same documented public network protocol. Neither target may depend on access to the private repository, private credentials, proprietary node binaries or internal services. Publish public build instructions, supported platform matrix, versioned interface specifications, verified network configuration, dependency locks and compatibility tests. Test both targets from clean public checkouts, including authentication, messaging, offline recovery, protocol compatibility and security failure handling; test installer upgrades and web deployment separately. Use synthetic test credentials and approved test environments. Never silently publish private code or bypass release review. If either target cannot be built or tested, record the blocker and do not certify the sweep complete. This is a mandatory checklist for relevant engineering sweeps, not authorization to deploy or spend funds.


## Aurora Covenant boundary
The original eight NULLADIT contracts remain the constitutional base. Aurora Covenant is a proposed subordinate release registry only; it does not grant NOMC governance, mining, node, or administrator privileges and cannot compel client or operator updates. Do not treat a repository commit or registry proposal as deployment approval. Any client integration must verify the exact approved artifact and remain within public interfaces.
