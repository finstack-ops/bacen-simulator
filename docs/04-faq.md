# FAQ

## Why build bacen-simulator when BCB homologation / Pix Tester / Woovi sandbox exist?

> *Pergunta original:* "Existe o ambiente de homologação do Banco Central, existe o pix tester e existe o woovi tester que permite realizar esses testes" — i.e., these alternatives already exist, so why build our own simulator?

Short answer: the three alternatives solve different problems, and none of them is a free, local, zero-onboarding-barrier way to exercise the BCB DICT/SPI protocol from day one of a Pix product.

### What each alternative actually offers

- **BCB homologation environment.** The most faithful option — it *is* the real system, in test mode. But access presupposes the applicant is already an authorized institution/PSP in a formal onboarding process. Direct SPI participation requires RSFN connectivity, ICP-Brasil certificates, minimum paid-up capital, registration by Deban/Gemon, and a **5-month (+2 extendable)** window to complete tests and file an aptitude declaration ([Roteiro para Participação Direta no SPI](https://www.bcb.gov.br/content/estabilidadefinanceira/sistemapagamentosinstantaneos_docs/Roteiro_para_Participacao_Direta_no_SPI_e_abertura_de_Conta_PI.pdf)). DICT access for indirect participants requires homologation tests sponsored by a direct participant, scheduled in advance by email, in 1-hour test windows ([IN BCB 508/2024](https://www.legisweb.com.br/legislacao/?id=463894); [bacen/pix-api discussion #439](https://github.com/bacen/pix-api/discussions/439)). None of this is available to a team that isn't yet an authorized PSP.
- **"Pix Tester."** No third-party tool by this exact name was found; the closest official match is BCB's **QR Code validation tool**, used to validate static/dynamic Pix Cobrança QR Codes. It does not cover DICT, SPI, `pacs`/`admi` messages, or the key/claim/MED lifecycle, and access is restricted to direct participants ([bacen/pix-api issue #373](https://github.com/bacen/pix-api/issues/373); [bacen/pix-api discussion #424](https://github.com/bacen/pix-api/discussions/424)).
- **Woovi/OpenPix sandbox.** A proprietary environment that simulates **Woovi's own API and webhooks** (charges, payments, error simulation via special test accounts), not the BCB DICT/SPI protocol. It requires a Woovi/OpenPix account (`app.woovi-sandbox.com`) and only helps teams building on top of Woovi as their PSP ([Woovi Developers — Test Environment](https://developers.woovi.com/en/docs/test-environment); [Sandbox Error Simulation](https://developers.woovi.com/en/docs/flows/sandbox-error-simulation)).

### What bacen-simulator uniquely provides

- Runs **locally and offline**, with no authorization, capital, or accreditation prerequisite — clone and run with `docker compose` / `pnpm` on day one.
- Simulates the **real protocol shapes and flows** of DICT (API v2, XML, RFC 7807) and SPI (`pacs.008` / `pacs.002` / `pacs.004`, transaction state machine) — not a vendor's abstraction over its own API.
- **Free and open-source**, embeddable in CI, with no dependency on BCB scheduling or availability.
- Roadmap tracks the official spec (claims, refunds/MED, rate-limiting) as it evolves — see [ROADMAP.md](../ROADMAP.md).

### Honest current gaps

- No XMLDSig signing, no mTLS, no ICP-Brasil certificate handling — messages are sent in plain XML.
- No real RSFN transport — the SPI prototype uses a plain MQTT broker instead of IBM MQ over RSFN.
- DICT claims and refunds are **route stubs only** — no persistence, validation, or tables yet.
- SPI's `TransactionManager` state machine is unit-tested but **not yet wired** to the MQTT transport.

It is a fidelity-of-shapes simulator, not a security or topology replica — see [docs/01-bacen-context.md §5](./01-bacen-context.md#5-what-the-simulator-does-and-does-not-do).

### When you should NOT use ours

- To **go live** — real BCB homologation is mandatory and has no substitute.
- To validate cryptographic security (XMLDSig, mTLS, ICP-Brasil certificates).
- If the product is built **on top of Woovi/OpenPix as its PSP** — their sandbox tests exactly the surface you'll consume.
- To validate real RSFN network timing/SLA or production-load behavior.

### Verdict

The case for building it holds up: none of the three alternatives is a free, local, zero-onboarding-barrier environment for simulating the BCB DICT/SPI protocol from day one of a Pix product. BCB's environment is the finish line with a high entry bar; the QR Code tool only covers QR codes; Woovi's sandbox tests Woovi. bacen-simulator fills that gap — faster local development and CI before, or independent of, accreditation. The honest caveat: it doesn't yet cover claims/refunds/MED realistically, so for those specific features the team still depends on official docs and, eventually, the real BCB environment for final validation.

Next: back to [README.md](../README.md).
