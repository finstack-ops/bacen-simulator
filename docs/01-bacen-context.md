# Understanding BACEN and Pix

This document is for developers who are new to Brazilian payments. It explains the real-world system that `bacen-simulator` imitates, so the codebase makes sense. Start here if you have never worked with Pix before.

## 1. What BACEN and Pix are

**BACEN** — the *Banco Central do Brasil* — is Brazil's central bank. Among other duties, it operates **Pix**, the national instant payment scheme launched in November 2020. Pix settled into mass adoption fast: in H2 2025 it accounted for roughly 54.7% of all payment transactions in Brazil, and it set a single-day record of 313.3 million transactions on December 5, 2025.

Pix is not a single system. It is a set of rules and services built on three pieces of infrastructure, all run or governed by BACEN:

1. **SPI** — the settlement rail where payments actually move.
2. **DICT** — the directory that maps a Pix "key" to a bank account.
3. **RSFN** — the private network that carries the messages between participants.

## 2. The three pillars: SPI, DICT, RSFN

### SPI (Sistema de Pagamentos Instantâneos)

The settlement rail operated by BCB. Participants (banks and payment institutions, called **PSPs** — *Prestadores de Serviço de Pagamento*) exchange **ISO 20022 XML messages** to move money in real time, 24/7/365.

In production, SPI messages travel over **RSFN** (*Rede do Sistema Financeiro Nacional*, the dedicated financial network). Both channels use **ICOM** (*Interface de Comunicação do SPI*), an HTTPS-based interface — the primary and restricted secondary channels differ by network priority class and port, not by protocol. (IBM MQ is used for other RSFN messaging domains, such as STR, but not for SPI/Pix.) Every message is **XMLDSig-signed**, and connections require **mTLS** with **ICP-Brasil** certificates (SPB — *Sistema de Pagamentos Brasileiro* — standard), at TLS 1.2 or higher.

### DICT (Diretório de Identificadores de Contas Transacionais)

The Pix key directory. A **Pix key** is an alias that points at one account: a CPF/CNPJ (tax id), a phone number, an email, or an **EVP** (*Endereço Virtual de Pagamento* — a random key). Users hand a key to a payer instead of a branch and account number, and DICT resolves it. DICT is a **REST API with XML bodies**; the current spec is **API v2**, in production since November 5, 2023 (v1 was retired in February 2024).

### RSFN (Rede do Sistema Financeiro Nacional)

The private network that connects authorized financial institutions to BCB. SPI rides on RSFN. The simulator does **not** touch RSFN at all — that is exactly the gap it fills (see section 5).

## 3. DICT in depth

A Pix key maps to exactly one account at one participant. DICT stores the key, the owning account, the owner's tax id, and metadata such as the ownership date. Keys can be **ported** between participants through a *claim* flow, and they can be the subject of an **ownership claim** when two parties disagree on who controls them.

### API v2 endpoint groups

DICT's full surface is larger than "look up a key". The groups are:

| Group | Purpose | Simulated here? |
|---|---|---|
| Directory | Entries CRUD — create, read, update, delete keys | ✅ yes |
| Key | `keys/check` — batch validation of key ownership | ✅ yes |
| Claim | Portability and ownership claims between participants | 🚧 partial (route stubs only) |
| Reconciliation | CID (*Content Identifier* — a hash-based sync mechanism, VSync) | ❌ no |
| InfractionReport | Reporting fraud or infractions on a key | ❌ no |
| Refund (MED) | *Mecanismo Especial de Devolução* — special refund mechanism | 🚧 partial (route stubs only) |
| Statistics | Aggregated DICT usage data | ❌ no |
| Policies | Rate limits per participant | ❌ no |

API v2 also added **unilateral fraud markers**, so a participant can flag a key as fraudulent.

### Rate limiting

DICT enforces a **token-bucket** rate limit (in Portuguese, *balde de fichas*) per participant and per end user. When the bucket is empty, DICT responds with **HTTP 429**. Refill rates vary by participant category (A through F).

### MED — Mecanismo Especial de Devolução

The special refund mechanism used for fraud and error cases. **MED 2.0**, activated May 11, 2026, traces and blocks fraud funds across multiple hops; MED 1.0 only reached the first receiving account.

## 4. SPI in depth

SPI participants exchange ISO 20022 XML messages. The confirmed Pix message set includes:

| Message | Purpose |
|---|---|
| `pacs.008` | Payment order (the actual funds transfer instruction) |
| `pacs.002` | Status report (settlement / clearing outcome) |
| `pacs.004` | Return of funds |
| `admi.002` | Rejection / system notice |
| `pibr.001` / `pibr.002` | Echo and connectivity-test messages used in homologation |
| `camt.055` / `camt.029` | Cancellation request and confirmation (used in MED cancellation handshakes) |
| `camt.060` / `camt.053` / `camt.054` | Conta PI (settlement account) query and balance/statement responses |

> Note: `pacs.028` does not appear in the Catálogo de Serviços do SFN and is **not** part of Pix. The `camt.*` messages above **are** confirmed part of the set (per Catálogo Volume VI) but this simulator does not model any of them.

### Typical payment flow

A payment moves through several message exchanges:

1. The **payer PSP** sends a `pacs.008` payment order to **SPI**.
2. SPI validates, settles, and forwards the order to the **payee PSP**.
3. The payee PSP replies with a `pacs.002` status report.
4. SPI propagates the status back to the payer PSP.

If something goes wrong (fraud, wrong amount), a `pacs.004` return is issued under MED (with return-reason codes such as `FR01` for fraud or `BE08` for operational failure). `admi.002` is a separate, general processing-error/rejection notice — the official MED implementation guide does not tie it to the fraud-return flow specifically.

### The SFN XML envelope

Every message on RSFN is wrapped in a standard envelope defined in the *Catálogo de Serviços do SFN*. The structure is `DOC` containing `BCMSG` (control), `SISMSG` (system message), and `USERMSG` (user area). The first example is the generic envelope shape:

```xml
<?xml version="1.0"?>
<DOC xmlns="http://www.bcb.gov.br/XXX/YYYYYYY.xsd">
 <BCMSG>
 . . . control
 </BCMSG>
 <SISMSG>
 . . . system
 </SISMSG>
 <USERMSG>
 . . . user
 </USERMSG>
</DOC>
```

A concrete echo message, `GEN0001`, shows the header fields populated:

```xml
<?xml version="1.0"?>
<DOC xmlns="http://www.bcb.gov.br/GEN/GEN0001.xsd">
 <BCMSG>
 <IdentdEmissor>########</IdentdEmissor>
 <IdentdDestinatario>########</IdentdDestinatario>
 <DomSist>SPB01</DomSist>
 <NUOp>###########################################</NUOp>
 </BCMSG>
 <SISMSG>
 <GEN0001>
 <CodMsg>GEN0001</CodMsg>
 <ISPBEmissor>########</ISPBEmissor>
 <ISPBDestinatario>########</ISPBDestinatario>
 <MsgECO>text with max of 50 characters</MsgECO>
 </GEN0001>
 </SISMSG>
 <USERMSG>
 . . . free area
 </USERMSG>
</DOC>
```

Source: [*Catálogo de Serviços do SFN* Volume III](https://www.bcb.gov.br/content/estabilidadefinanceira/cedsfn/Catalogos/Catalogo_de_Servicos_do_SFN_Volume_III_Versao_507.pdf) (the linked version is 507; these catalog volumes are revised periodically, so the latest edition may differ).

## 5. What the simulator does and does not do

This project exists so PSP developers can exercise the **shapes and flows** of the DICT and SPI APIs locally, without BCB homologation access.

**It simulates:**

- The DICT REST API request/response XML shapes and the basic entry lifecycle (create, read, update, delete, key check).
- The SPI message-flow logic for a payment, via an in-process state machine.
- A local SQLite-backed directory seeded with real institution data.

**It does not simulate:**

- Cryptographic signatures (XMLDSig) or mTLS — messages are sent in plain XML.
- The RSFN transport — the SPI prototype uses a plain MQTT broker instead of IBM MQ over RSFN.
- ICP-Brasil certificate handling.
- High-availability infrastructure. SQLite is a single local file, not a redundant cluster.

In short: it is a **fidelity-of-shapes** simulator, not a security or topology replica. Do not use it to validate real inter-PSP cryptography.

## 6. Recent Pix evolution (2025–2026)

These changes are context for the simulator's roadmap, not features it implements:

- **Pix Automático** — recurring payments; PSPs offering transactional accounts had to make it available to payers starting June 16, 2025. A separate, later mandate required unregulated billers to migrate recurring charges to Pix Automático starting October 13, 2025, with existing contracts required to migrate by January 1, 2026.
- **Pix por aproximação (NFC)** — tap-to-pay, live since February 2025. *Instrução Normativa* 746/2026 removed the per-transaction value cap, with full rollout by October 1, 2026.
- **MED 2.0** — the upgraded special refund mechanism, activated May 11, 2026, which traces fraud funds across multiple hops.
- **Pix Parcelado** (installment payments) — BCB dropped its plans to regulate it in December 2025.
- **Pix em garantia** (Pix as collateral/escrow) — pushed to the 2027 agenda.
- **Resoluções BCB 494–498** (September 2025) tightened key-management and message-signing responsibilities for participants.

## 7. Official references

- [DICT API changelog (current version 2.12.0 as of 2026-06-29)](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/changelog.html)
- [DICT API FAQ (v2)](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/duvidas_comuns_api_v2.html)
- [Frozen OpenAPI (historical, 1.8.0) — bacen/pix-dict-api](https://github.com/bacen/pix-dict-api)
- [Catálogo de Serviços do SFN Volume VI (Pagamentos Instantâneos), v5.11](https://www.bcb.gov.br/content/estabilidadefinanceira/cedsfn/Catalogos/Catalogo_de_Servicos_do_SFN_Volume_VI_Versao_511.pdf)
- [Guia de Implementação do Canal Secundário](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Guia_Implementacao_Canal_Secundario_Transmissao_Mensagens.pdf)
- [Manual Operacional do DICT](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/X_ManualOperacionaldoDICT.pdf)
- [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [Pix regulation portal](https://www.bcb.gov.br/estabilidadefinanceira/pix)
- Related open-source: [open-pix-br/open-pix](https://github.com/open-pix-br/open-pix) (homologation toolkit)

> The frozen `bacen/pix-dict-api` repo is at version 1.8.0 and references API-DICT-2.0.1 — both superseded. The current DICT API version is **2.12.0** (released 2026-06-29, per BCB's changelog). The authoritative source is always the changelog page on bcb.gov.br.

**Fontes:** every factual claim in this document is backed by a source recorded in [docs/references.md](./references.md) — see that file for the full list, grouped by topic, with version/date and official-vs-secondary status per source.

Next: [architecture](./02-architecture.md).
