# NSELCBA — NOMC compatibility boundary

**RESEARCH ONLY — NOT DEPLOYED OR INTEGRATED INTO NOMC.**

NSELCBA is a separate operator-side candidate for voluntary acceptance of Proof-of-Service compensation terms and for recording an operator's service-exchange statement. It is not a messenger account feature.

## Client behavior

- Wallet connection and message sign-in must not call NSELCBA or require acceptance of its terms.
- Sending, receiving, or retrieving a legitimate message and making a recipient claim must not depend on NULL22, this contract, or a node's compensation choice.
- NOMC must not display the project title as a regulator finding or say that the contract establishes whether NULL22 is a security or a transaction is lawful barter.
- A wallet signature proves control of that cryptographic account for the signed action; it does not establish legal identity or another participant's assent.
- Do not hardcode a contract address or add a new dependency until the exact public interface, network configuration, review, and governance approval exist.

No client source, installer, website, app, permissions, protocol configuration, or release behavior is changed by this boundary note. The candidate source, terms, artifact, tests, and deployment gates are maintained separately in PELAVIUM and the private core. This document is not an authorization to integrate or deploy the contract.
