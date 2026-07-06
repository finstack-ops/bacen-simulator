# Roadmap

This roadmap describes where [bacen-simulator](https://github.com/gustav0d/bacen-simulator) is headed. It is a maintained fork of the unmaintained [eletroswing/bacen-simulator](https://github.com/eletroswing/bacen-simulator) — a TypeScript monorepo that simulates BACEN's Pix infrastructure (DICT + SPI) for local PSP development.

The plan below is grounded in three things: the current state of the code in this repo, the open issues tracked upstream at <https://github.com/eletroswing/bacen-simulator/issues>, and the July-2026 state of BCB's Pix specifications (DICT API v2, Catálogo de Serviços do SFN Vol. VI, ISO 20022 `pacs`/`admi`/`pibr` messages). It will be revised as specs evolve and as work lands.

## Current state

| Area | Status |
| --- | --- |
| DICT entries CRUD + batch key check | Implemented and e2e-tested (Fastify + XML + Zod + SQLite) |
| DICT claims & refunds | Route stubs only — no persistence, validation, or tables |
| SPI | MQTT echo prototype; `TransactionManager` state machine unit-tested but not wired to the broker |
| Infra | SQLite with a single non-versioned create-table script; seeds from a real ISPB institutions CSV |
| CI / Docker | No CI; no unified `docker compose` (API-only compose at root, Mosquitto-only compose in `packages/docker`); migrations don't run in Docker |
| Toolchain | Dated — Node 21.7.0 (non-LTS, EOL) pinned only in Dockerfile; no `.nvmrc`/`engines`; Turbo v1; Biome 1.6; TypeScript 5.4; Fastify 4; Zod 3.22; `ts-node-dev` |

## Guiding principles

- **Fidelity to official BCB specs** (DICT API v2, Catálogo de Serviços do SFN Vol. VI, ISO 20022 `pacs`/`admi`/`pibr` messages) over convenience shortcuts.
- **Honest scope**: simulate API shapes, flows, and error semantics — not RSFN, mTLS, or XMLDSig cryptography (these may become opt-in toggles later).
- **Every feature lands with automated tests and OpenAPI docs.**
- **Keep the simulator runnable with one command** (`docker compose`) on a current Node LTS.

## Phases

### Phase 0 — Platform modernization & engineering conventions (PRIORITY)

> The explicit top priority — everything else builds on a current, consistent platform.

- [ ] Upgrade to a current Node.js LTS (22.x or 24.x): bump Dockerfile base image, add `.nvmrc`, add `engines` to all package.json files, align `@types/node`.
- [ ] Standardize Node.js conventions across the monorepo: modern `tsconfig` targets (es2022+), evaluate ESM migration, replace `ts-node`/`ts-node-dev` with `tsx` or native `node --watch` + build step, consistent per-workspace scripts.
- [ ] Upgrade toolchain: Turborepo v2, Biome (latest), TypeScript (latest), Fastify v5, Zod v4, fast-xml-parser latest; evaluate `better-sqlite3` or a typed query layer for the infra package.
- [ ] Standardize AI engineering conventions: add agent context files (`CLAUDE.md` / `AGENTS.md`) describing architecture, commands, and conventions; keep `docs/` structured so coding agents can navigate; document conventions for schema-first, test-first changes.
- [ ] GitHub Actions CI ([upstream #67](https://github.com/eletroswing/bacen-simulator/issues/67)): lint, type-check, test, build on PRs; Docker image build on `main`.

### Phase 1 — Correctness & DX hardening

- [ ] Fix known bugs found in the July 2026 audit: `apps/api/schemas/DICT/ownerSchema.ts` copy-pasted `superRefine` error messages/paths; `apps/api/services/DICT/entries/deleteKey.ts` accesses `queriedParticipant.participant` before the null check (degrades 404/403 to 503); `apps/api/services/DICT/keys/check.yml` documents the wrong request/response schemas; remove leftover scaffold test `apps/api/tests/e2e/DICT/entries/jestTesting.post.test.ts`.
- [ ] Unified `docker compose` bringing up API + SPI + Mosquitto together, with migrations/seed on startup.
- [ ] Versioned migration system (numbered migrations, up/down) replacing the single create-table script.
- [ ] Structured logging (replace the TODO console logger in `packages/infra`) — pino, with request IDs; groundwork for observability.
- [ ] Revisit API reference UI ([upstream #73](https://github.com/eletroswing/bacen-simulator/issues/73): Scalar UI broke XML bodies; currently rolled back to Swagger UI).

### Phase 2 — DICT completeness (target: official DICT API v2 surface)

Reference: <https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT-2.0.1.html>

- [ ] Claims (key portability & ownership): schema, `tb_Claims` table, full lifecycle endpoints (create/acknowledge/confirm/cancel/complete), tests. (Replaces current stubs.)
- [ ] Refunds / MED ([upstream #8](https://github.com/eletroswing/bacen-simulator/issues/8)): `tb_Refunds`, lifecycle endpoints (create/cancel/close), semantics informed by MED 2.0 (active since May 2026 — multi-hop tracing).
- [ ] Infraction reports & fraud markers (DICT v2 addition: unilateral fraud marking).
- [ ] Rate-limiting simulation: token-bucket ("balde de fichas") per participant + per user, HTTP 429 responses, participant categories — configurable so clients can test 429 handling.
- [ ] Entries list/statistics endpoints as per spec (evaluate scope).

### Phase 3 — SPI: from prototype to functional settlement simulator (upstream issues #68–#82)

- [ ] Zod schema validation for SPI messages ([upstream #76](https://github.com/eletroswing/bacen-simulator/issues/76)): `pacs.008`, `pacs.002`, `pacs.004`, `admi.002` ([upstream #77](https://github.com/eletroswing/bacen-simulator/issues/77)), plus Bacen echo messages `pibr.001`/`pibr.002`.
- [ ] Wire `TransactionManager` to the MQTT transport: full payment flow payer PSP → SPI → payee PSP with status returns ([upstream #80](https://github.com/eletroswing/bacen-simulator/issues/80), [#79](https://github.com/eletroswing/bacen-simulator/issues/79)).
- [ ] Message builder that rebuilds headers SPI→PSP so one PSP's info doesn't leak to another ([upstream #82](https://github.com/eletroswing/bacen-simulator/issues/82)).
- [ ] Mosquitto topic conventions + ACLs: PSPs publish to the bacen channel but only SPI subscribes to all ([upstream #78](https://github.com/eletroswing/bacen-simulator/issues/78)).
- [ ] SPI test suite with a mocked broker ([upstream #81](https://github.com/eletroswing/bacen-simulator/issues/81)).
- [ ] SPI flow diagram in docs ([upstream #69](https://github.com/eletroswing/bacen-simulator/issues/69)).
- [ ] Persist transactions (currently in-memory only); settlement account balances for participants.

### Phase 4 — Ecosystem parity (stretch, tracks BCB's agenda)

- [ ] Homologation-style test harness: scripted `pibr.001`/`002` echo tests and `pacs` payment-flow scenarios mirroring BCB's homologation regime (IN BCB 508/2024).
- [ ] Pix Automático (recurring payments, live since June 2025): evaluate simulating the recurring-authorization flow.
- [ ] DICT reconciliation / CID sync endpoints.
- [ ] Optional realism toggles: XMLDSig signature validation, mTLS between simulator and client.
- [ ] Seed-data refresh tooling (current ISPB institutions CSV is from 2024-03-12).

## How to propose changes

Open an issue or a PR on the fork ([`CONTRIBUTING.md`](CONTRIBUTING.md)) — see <https://github.com/gustav0d/bacen-simulator/issues>.
