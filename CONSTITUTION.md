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
