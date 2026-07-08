# Supporter

<div align="center">
  <a href="https://woovi.com/">
    <img src="https://i.imgur.com/GYZHtWT.png" alt="Logo Woovi">
  </a>
</div>

# bacen-simulator

A local, Docker-friendly simulator of BACEN's Pix infrastructure — **DICT** (the key directory) and **SPI** (the settlement rail) — so PSP developers can build and test integrations without access to BCB homologation.

This is a **maintained fork** of [eletroswing/bacen-simulator](https://github.com/eletroswing/bacen-simulator).

## Quickstart

```sh
git clone https://github.com/finstack-ops/bacen-simulator
cd bacen-simulator
pnpm install          # install all workspaces (writes pnpm-lock.yaml)
pnpm run migration      # create tables + seed
pnpm run dev            # turbo dev across apps
```

- **API (DICT):** http://localhost:8080 — Swagger UI at http://localhost:8080/docs
- **SPI** needs a broker: `pnpm run compose:up` (Mosquitto) and an `apps/spi/.env` copied from `.env.example`.

## Documentation

- [docs/01-bacen-context.md](docs/01-bacen-context.md) — **start here if you're new to Pix.** What BACEN, DICT, SPI, and RSFN are.
- [docs/02-architecture.md](docs/02-architecture.md) — monorepo layout, request lifecycle, data model, implementation status.
- [docs/03-development.md](docs/03-development.md) — install, run, test, lint, Docker.
- [docs/04-faq.md](docs/04-faq.md) — frequently asked questions, e.g. why build this vs. BCB homologation / Pix Tester / Woovi sandbox.
- [ROADMAP.md](ROADMAP.md) — direction, planned work, and tooling decisions.
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute.

## Stack

- [Fastify](https://fastify.dev/) 4.26 — HTTP server
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/) — validation
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) — XML request/response bodies
- [sqlite3](https://www.npmjs.com/package/sqlite3) — local persistence _(current; decided migration to [Turso](https://github.com/tursodatabase/turso) — see [ROADMAP.md](ROADMAP.md#tooling-decisions-decided))_
- [mqtt](https://www.npmjs.com/package/mqtt) / [Eclipse Mosquitto](https://mosquitto.org/) — SPI prototype transport
- [Turborepo](https://turbo.build/) — monorepo orchestration
- [Biome](https://biomejs.dev/) — lint/format
- [Vitest](https://vitest.dev/) — tests _(decided target; currently [Jest](https://jestjs.io/))_

## License

MIT.
