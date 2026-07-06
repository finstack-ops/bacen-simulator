# Supporter

<div align="center">
  <a href="https://woovi.com/">
    <img src="https://i.imgur.com/GYZHtWT.png" alt="Logo Woovi">
  </a>
</div>

# bacen-simulator

A local, Docker-friendly simulator of BACEN's Pix infrastructure — both **DICT** (*Diretório de Identificadores de Contas Transacionais*, the key directory) and **SPI** (*Sistema de Pagamentos Instantâneos*, the settlement rail) — so PSP (*Prestador de Serviço de Pagamento*) developers can build and test integrations without access to BCB homologation.

This is a **maintained fork** of the original at [github.com/eletroswing/bacen-simulator](https://github.com/eletroswing/bacen-simulator). Old issues there remain useful as historical context.

## Why

There is **no public, always-on BCB sandbox**. Joining the real homologation regime (*IN BCB 508/2024*) takes roughly 3–4 months and requires ICP-Brasil certificates, RSFN connectivity, and signed echo tests. Teams need something they can run locally to develop against the same XML shapes and flows.

## Implementation status

| Area | Status |
|---|---|
| DICT entries (`GET/POST/PUT` + `POST /:key/delete` under `/api/dict/entries`) | ✅ implemented + e2e tested |
| DICT key check (`POST /api/dict/keys/check`, batch) | ✅ implemented + tested |
| DICT claims (`/api/dict/claims...`) | 🚧 route stubs only (no persistence/validation) |
| DICT refunds / MED (`/api/dict/refunds...`) | 🚧 route stubs only |
| SPI MQTT connectivity | 🚧 prototype (echo bot) |
| SPI transaction manager | ✅ modeled + unit tested, ❌ not integrated with MQTT |
| Swagger / OpenAPI docs | partial (entries + key check only; served at `/docs`) |
| CI (GitHub Actions) | ❌ none |

See [docs/02-architecture.md](docs/02-architecture.md) for details.

## Quickstart

```sh
git clone https://github.com/gustav0d/bacen-simulator
cd bacen-simulator
npm ci
npm run migration      # create tables + seed
npm run dev            # turbo dev across apps
```

- **API (DICT):** http://localhost:8080 — Swagger UI at http://localhost:8080/docs
- **SPI** needs a broker: `npm run compose:up` (Mosquitto) and an `apps/spi/.env` copied from `.env.example`.

Full setup, including the SPI broker port caveat, is in [docs/03-development.md](docs/03-development.md).

## Documentation

1. [docs/01-bacen-context.md](docs/01-bacen-context.md) — **start here if you're new to Pix.** What BACEN, DICT, SPI, and RSFN are.
2. [docs/02-architecture.md](docs/02-architecture.md) — monorepo layout, request lifecycle, data model.
3. [docs/03-development.md](docs/03-development.md) — install, run, test, lint, Docker.
4. [ROADMAP.md](ROADMAP.md) — direction and planned work.
5. [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute.

## Stack

- [Fastify](https://fastify.dev/) 4.26 — HTTP server
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/) — validation
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) — XML request/response bodies
- [sqlite3](https://www.npmjs.com/package/sqlite3) — local persistence
- [mqtt](https://www.npmjs.com/package/mqtt) / [Eclipse Mosquitto](https://mosquitto.org/) — SPI prototype transport
- [Turborepo](https://turbo.build/) — monorepo orchestration
- [Biome](https://biomejs.dev/) — lint/format
- [Jest](https://jestjs.io/) — tests

## License

MIT.
