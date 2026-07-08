# Architecture

How `bacen-simulator` is laid out and how the pieces fit together. Read [01-bacen-context.md](./01-bacen-context.md) first if any term here is unfamiliar.

## 1. Monorepo overview

The repo is a **Turborepo** workspace with two apps and two shared packages:

```
bacen-simulator/
├── apps/
│   ├── api/        # DICT HTTP service (Fastify)
│   └── spi/        # SPI prototype: MQTT echo bot + transaction manager
├── packages/
│   ├── docker/     # docker-compose for the Mosquitto broker only
│   └── infra/      # SQLite database, migrations, seed, logger
├── assets/         # diagrams + institutions CSV
├── Dockerfile      # builds the whole monorepo, runs turbo
└── compose.yaml    # runs only the API
```

| Workspace | Role |
|---|---|
| `apps/api` | DICT HTTP service. Fastify 4.26, XML bodies, Zod validation, SQLite via `packages/infra`. Serves Swagger UI at `/docs`. |
| `apps/spi` | SPI service prototype. MQTT client (`mqtt` 5.x) plus an in-process transaction state machine. |
| `packages/infra` | Shared SQLite layer: single-file DB, promisified helpers, idempotent migration script, seed script, logger. |
| `packages/docker` | `docker-compose.yml` that runs only the Eclipse Mosquitto broker for the SPI prototype. |

## 2. `apps/api` — the DICT service

Entrypoint is `apps/api/server.ts`. It builds a Fastify instance via `buildServer.ts` and listens on `PORT` (default `8080`).

### Request lifecycle

Every request flows through the same pipeline:

1. **XML parse** — a custom XML body parser (`plugins/xmlBodyParser`) turns the `application/xml` body into a JS object using `fast-xml-parser`.
2. **Zod validate** — route schemas validate the parsed object.
3. **Service** — a handler in `services/DICT/**` does the work.
4. **SQLite** — persistence goes through `packages/infra` promisified helpers.
5. **XML response** — the reply is serialized back to XML.

On error, the server returns **RFC 7807** problem details as `application/problem+xml`, with Bacen-flavored `type` URLs such as `https://dict.pi.rsfn.net.br/api/v2/error/EntryInvalid`.

### Endpoints and implementation status

All DICT routes are mounted under `/api/dict/...`:

| Method & path | Status |
|---|---|
| `GET /api/dict/entries/:key` | ✅ implemented |
| `POST /api/dict/entries` | ✅ implemented |
| `PUT /api/dict/entries/:key` | ✅ implemented |
| `POST /api/dict/entries/:key/delete` | ✅ implemented |
| `POST /api/dict/keys/check` (batch key check) | ✅ implemented |
| `POST /api/dict/claims`, `GET /api/dict/claims`, `GET /api/dict/claims/:id`, `POST /api/dict/claims/:id/{acknowledge,confirm,cancel,complete}` | 🚧 route stubs only — return placeholder strings, no persistence or validation |
| `POST /api/dict/refunds`, `GET /api/dict/refunds`, `GET /api/dict/refunds/:id`, `POST /api/dict/refunds/:id/{cancel,close}` | 🚧 route stubs only |

### Swagger / OpenAPI

Swagger UI is served at `/docs`. The spec is assembled by `swagger-jsdoc` from `.yml` fragments under `apps/api/services/DICT/**`. Coverage is **partial**: only the entries and key-check operations are documented today.

### Tests

The API is covered by **Jest** end-to-end tests under `apps/api/tests/e2e/DICT`. They use Fastify's `inject` to drive the app in-process against a mocked database layer. Claims and refunds have no tests yet (they are stubs). _(Decided migration from Jest to **Vitest** — see [ROADMAP.md](../ROADMAP.md#tooling-decisions-decided) "Tooling decisions".)_

## 3. `apps/spi` — the SPI prototype

`apps/spi` is in two halves that are **not yet connected**.

### Current runtime: MQTT echo bot

`apps/spi/main.ts` connects to a Mosquitto broker using `MQTT_CONNECTION_STRING` (see `apps/spi/.env.example`), subscribes to the wildcard topic `#`, and echoes every message it receives back to `<topic>/resposta`. That is the entirety of the live behavior today.

### The transaction manager (modeled, not wired up)

`apps/spi/transactions/` contains a `TransactionManager` class that models a payment as a **state machine**. The one implemented flow is `CREATE_PAYMENT`, advancing through message steps in the order **PSP_1 → SPI → PSP_2 → SPI** and exchanging `pacs.008`, `pacs.002`, and `pacs.004` message types. Each transaction has a **40-second timeout** that aborts it if the expected next message does not arrive in time.

The `TransactionManager` is **unit-tested** (`apps/spi/tests/unit/transactionManager.test.ts`) but is **not yet wired into `main.ts`** — incoming MQTT messages do not feed it yet. Bridging the two is pending work.

## 4. `packages/infra` — the data layer

- **Engine:** SQLite, via the `sqlite3` npm package, stored as a single file at `packages/infra/database.sqlite`.
- **Helpers:** `database.ts` adds promisified wrappers (`get_sync`, `run_sync`, `get_multiple_sync`, `exec_sync`) on top of the callback-based `sqlite3` API.
- **Decided target:** migrate from `sqlite3` to [Turso](https://github.com/tursodatabase/turso) (libSQL), replacing `packages/infra/database.ts`. Not started — see [ROADMAP.md](../ROADMAP.md#tooling-decisions-decided) "Tooling decisions".
- **Logger:** a minimal `logger.ts`.

### Tables

`migrate.ts` creates four tables with `CREATE TABLE IF NOT EXISTS`:

| Table | Primary key | Notable columns |
|---|---|---|
| `tb_Institutions` | `ispbNumber` | `nome` |
| `tb_Owners` | `taxIdNumber` | `type`, `name`, `tradeName` |
| `tb_Accounts` | `accountNumber` | `participant`, `accountType`, `openingDate`, `branch` |
| `tb_Entries` | `key` | `taxIdNumber`, `accountNumber`, `keyType`, `keyOwnershipDate`, `openClaimCreationDate` |

There are **no claims or refunds tables yet** — matching the fact that those routes are stubs.

### Migration and seed limitations

- `migrate.ts` is an **idempotent `CREATE TABLE IF NOT EXISTS` script**, not a versioned migration system. There is no rollback, no migration history table, no schema diffing.
- `seed_database.ts` loads the real institution list from `assets/institutions_on_bacen_until_12_03_24.csv` and also inserts a few fixed test rows (a test institution, a natural-person owner, a legal-person owner, and a test account) used by the e2e tests.

## 5. `packages/docker` and the root Docker setup

### Broker (`packages/docker`)

`packages/docker/docker-compose.yml` runs **only** the Eclipse Mosquitto broker, mapping **host port 2999 → container port 1883**. Its config (`mosquitto/mosquitto.conf`) uses **anonymous authentication** — this is for local development only, never production.

### Root `Dockerfile` and `compose.yaml`

- The root `Dockerfile` builds the **whole monorepo** on `node:21.7.0-alpine`, runs `npm install`, and starts everything via `npm start` (turbo).
- The root `compose.yaml` runs **only the API** service on port 8080.

### Current gaps

There is **no single compose file** that brings up API + SPI + Mosquitto together — you compose the broker separately and run the apps via turbo. Migrations also **do not run automatically** inside Docker; you must run `npm run migration` against the image/container yourself.

## 6. Diagrams

These images live in `assets/` and illustrate the intended design.

**SPI flow** — the message exchange between PSPs and SPI:
![SPI flow](../assets/spi.png)

**General flow** — high-level end-to-end:
![General flow](../assets/flux.png)

**Conceptual data model:**
![Conceptual data model](../assets/conceitualBacen.png)

**Logical data model:**
![Logical data model](../assets/logicoBacen.png)

Next: [development guide](./03-development.md).
