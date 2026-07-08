# API Context — DICT

This context owns the **DICT** (Diretório de Identificadores de Contas Transacionais) HTTP API: a Fastify service that accepts `application/xml` request bodies, validates them with Zod, persists to SQLite (`packages/infra`), and returns XML responses or RFC 7807 problem details. It implements the Entry lifecycle (create/read/update/delete) and batch key check; **Claims and Refunds are route stubs only**. It does NOT own SPI/settlement, message signing (XMLDSig/mTLS), rate limiting, or the database engine itself.

## Glossary

- **Entry** — the registration of a Pix Key pointing at one Account and one Owner. The central aggregate of this context: `entrySchema`, table `tb_Entries`, and the `Entry` object in every response (`CreateEntryResponse.Entry`, `GetEntryResponse.Entry`). CRUD lives under `/api/dict/entries`.
- **Key** — the alias string that identifies an Entry, max 77 chars (`keyPathSchema`, `entrySchema`). Primary key `tb_Entries.key`. Passed as the `:key` path param and the `Key` body field.
- **KeyType** — the kind of Key. Enum `CPF | CNPJ | EMAIL | PHONE | EVP` (`entrySchema.KeyType`, stored as `tb_Entries.keyType`).
- **Owner** — the account holder linked to an Entry (`ownerSchema`, `tb_Owners`, the `Owner` response field).
  - **Type** — `NATURAL_PERSON` or `LEGAL_PERSON` (`ownerSchema.Type`, `tb_Owners.type`).
  - **TaxIdNumber** — CPF (11 digits, natural) or CNPJ (14 digits, legal); PK of `tb_Owners.taxIdNumber`.
  - **Name / TradeName** — holder display name; `TradeName` is required only for `LEGAL_PERSON` (`ownerSchema.superRefine`).
- **Account** — the transactional account an Entry points at (`accountSchema`, `tb_Accounts`, the `Account` response field).
  - **Participant** — the 8-digit ISPB identifying the institution holding the account (`accountSchema.Participant`, regex `/^[0-9]{8}$/`, `tb_Accounts.participant`), matching `tb_Institutions.ispbNumber`. Also the `Participant` field in `deleteKeySchema` (the requesting participant).
  - **Branch** — agency, 1–4 digits (`accountSchema.Branch`).
  - **AccountNumber** — account number, 1–20 digits; PK of `tb_Accounts.accountNumber`.
  - **AccountType** — enum `CACC | TRAN | SLRY | SVGS` (`accountSchema.AccountType`).
  - **OpeningDate** — account opening timestamp, ISO 8601 (`accountSchema.OpeningDate`).
- **Institution** — a Pix participant institution. `tb_Institutions` (`ispbNumber` PK, `nome`), seeded from `assets/institutions_on_bacen_until_12_03_24.csv`.
- **Reason** — the operation motive enum; allowed values differ per endpoint: create `USER_REQUESTED|RECONCILIATION` (`createEntrySchema`), update adds `BRANCH_TRANSFER` (`updateEntrySchema`), delete adds `ACCOUNT_CLOSURE|FRAUD` (`deleteKeySchema`).
- **RequestId / CorrelationId** — `CreateEntryRequest.RequestId` (UUID v4) is echoed as `CorrelationId` in responses for correlation/idempotency.
- **Signature** — required opaque field (`z.any()`) on create/update/delete bodies; placeholder for XMLDSig, never validated.
- **keys/check (`CheckKeysRequest`)** — batch validation of key ownership: returns each requested Key with an `@hasEntry` boolean (`services/DICT/keys/check.ts`, `checkKeysRequest`/`keyCheck` schemas).
- **Claim** — 🚧 stub. Portability/ownership claim over a Key between participants; routes under `/api/dict/claims` return placeholder strings only, no persistence. Planned lifecycle: create, acknowledge (donor participant, `OPEN` status), confirm, cancel, complete (`routes/DICT/claim.ts`). The `tb_Entries.openClaimCreationDate` column is reserved for this but has no claim semantics yet.
- **Refund** — 🚧 stub. Return request (MED / Mecanismo Especial de Devolução); routes under `/api/dict/refunds` return placeholder strings only. Planned lifecycle: create (only the debited participant), cancel, close (by the challenged participant) (`routes/DICT/refunds.ts`).
- **InfractionReport** — ❌ not started (no route). Fraud/infraction reporting on a Key plus unilateral fraud markers (DICT v2); named in `docs/01-bacen-context.md` but absent from this codebase.
- **problem details (RFC 7807)** — error envelope serialized as `application/problem+xml` with the `urn:ietf:rfc:7807` namespace and BACEN `type` URLs like `https://dict.pi.rsfn.net.br/api/v2/error/EntryInvalid` (`util/errors.ts`, `buildServer.ts` errorHandler).

## Avoided terms

- Don't say "registration", "binding", "record", or "alias mapping" — the term is **Entry**.
- Don't say "user", "customer", or "client" for the holder — the term is **Owner** (Type + TaxIdNumber).
- Don't say "bank" or "PSP" for the 8-digit identifier — the term is **Participant** (ISPB in `tb_Institutions.ispbNumber`).
- Don't say "agency" in code identifiers — the field is **Branch**.
- Don't say "chargeback" or "reversal" — the term is **Refund** / "return request" (MED).
- Don't say "transfer" for moving a Key between participants — the term is **Claim** (portability/ownership).

## Key invariants / states

- An Entry exists iff its row is in `tb_Entries`. **Create** (`POST /entries`) requires the Account and Owner to already exist and the Key to be absent, else **403 Forbidden** (`createKey.ts`); on success `keyOwnershipDate` is set to now.
- **Read** (`GET /entries/:key`) joins `tb_Entries` + `tb_Accounts` + `tb_Owners`; missing Key → **404**.
- **Update** (`PUT /entries/:key`) rewrites the linked `tb_Accounts` and `tb_Owners` rows inside a `BEGIN`/`COMMIT` transaction; it is intended to reject `EVP` keys with Reason `USER_REQUESTED` (403), though that guard reads a non-existent column today (latent bug, ROADMAP Phase 1). It does not rewrite the `tb_Entries` row itself.
- **Delete** (`POST /entries/:key/delete`) requires the requesting `Participant` to match the account's participant, else **403**; then removes the `tb_Entries` row.
- **keys/check** is read-only: answers per-Key `@hasEntry` booleans, never mutates.
- Claims and refunds have **no persistence and no state machine yet** (stubs).
- HTTP statuses in use: `200`, `201`, `400`, `403`, `404`, `503`. **`429` (token-bucket rate limit / "balde de fichas") is planned, not implemented.**

## Where things live

| Concept | Path |
| --- | --- |
| Entry / Key / Owner / Account schemas | `apps/api/schemas/DICT/*.ts` |
| Entry CRUD handlers | `apps/api/services/DICT/entries/*.ts` |
| Key check handler | `apps/api/services/DICT/keys/check.ts` |
| Claim stub routes | `apps/api/routes/DICT/claim.ts` |
| Refund stub routes | `apps/api/routes/DICT/refunds.ts` |
| Route mounting (`/api/dict/...`) | `apps/api/routes/DICT/index.ts`, `routes/index.ts`, `buildServer.ts` |
| XML body parser | `apps/api/plugins/xmlBodyParser.ts` |
| XML builder + RFC 7807 errors | `apps/api/util/buildXml.ts`, `util/errors.ts`, `util/zodValidator.ts` |
| Persistence (tables) | `packages/infra/migrate.ts`, `packages/infra/database.ts` |
