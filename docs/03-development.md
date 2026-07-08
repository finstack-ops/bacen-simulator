# Development guide

How to get `bacen-simulator` running locally, run tests, and contribute changes. See [02-architecture.md](./02-architecture.md) for how the pieces fit together.

## 1. Prerequisites

- **Node.js.** The root `Dockerfile` pins **Node 21.7.0** today. That version is non-LTS and past end-of-life; the roadmap plans a move to a current LTS release. In practice **Node >= 20** works for local development, but be aware the repo pins 21.7.0 in Docker.
- **Docker** (with the Compose plugin), used to run the Mosquitto broker for the SPI prototype.
- **pnpm**, for installing dependencies and running workspace scripts. The version is pinned via the `packageManager` field in `package.json` (enable it with `corepack enable`).

## 2. Install

Clone and install dependencies:

```sh
git clone https://github.com/finstack-ops/bacen-simulator
cd bacen-simulator
pnpm install   # install all workspaces (creates/updates pnpm-lock.yaml)
```

This is a pnpm workspace (`packages/*`, `apps/*`, see `pnpm-workspace.yaml`), so one install at the root sets up every package.

## 3. Migrations and seed

The database is a single SQLite file at `packages/infra/database.sqlite`. Before first run, create the schema and seed it:

```sh
pnpm run migration:run    # create tables (CREATE TABLE IF NOT EXISTS, idempotent)
pnpm run migration:seed   # seed institutions from assets/ + fixed test rows
pnpm run migration        # run both, in that order
```

Note: `migrate.ts` is an idempotent script, **not** a versioned migration system. Re-running it is safe but there is no rollback or migration history.

> The persistence layer currently uses the `sqlite3` driver. The decided target is [Turso](https://github.com/tursodatabase/turso) (libSQL), not yet implemented — see [ROADMAP.md](../ROADMAP.md#tooling-decisions-decided) "Tooling decisions".

## 4. Running the project

All run scripts go through **Turborepo**:

```sh
pnpm run dev     # turbo run dev  — watch mode across apps
pnpm run start   # turbo run start — run apps once
```

To run a single app, use Turbo's filtering from the repo root:

```sh
pnpm exec turbo run dev --filter=@repo/api
pnpm exec turbo run dev --filter=@repo/spi
```

- **API (DICT)** starts on `http://localhost:8080` (override with the `PORT` env var). Swagger UI is at `http://localhost:8080/docs`.
- **SPI** needs a broker before it can do anything useful (see next section).

## 5. SPI environment setup

The SPI prototype talks to a Mosquitto broker over MQTT.

1. Start the broker (provided by `packages/docker`):

   ```sh
   pnpm run compose:up
   ```

   This maps **host port 2999 → container port 1883**.

2. Configure the connection. Copy the example env and edit it:

   ```sh
   cp apps/spi/.env.example apps/spi/.env
   ```

   The example file ships `MQTT_CONNECTION_STRING=mqtt://john:travolta@localhost:1883`. Because the provided compose maps the broker to **host port 2999**, point your `.env` at 2999:

   ```env
   MQTT_CONNECTION_STRING=mqtt://localhost:2999
   ```

   Adjust the scheme/credentials to match whatever broker you actually run. The bundled config uses anonymous auth, so a bare `mqtt://localhost:2999` works against `pnpm run compose:up`.

3. Run the SPI app as shown above.

## 6. Tests

Tests currently run on **Jest** (decided migration to **Vitest** — see [ROADMAP.md](../ROADMAP.md#tooling-decisions-decided) "Tooling decisions"), one suite per app:

```sh
pnpm run test          # turbo run test
pnpm run test:watch    # turbo run test:watch
```

What is covered today:

- `apps/api` — end-to-end tests under `apps/api/tests/e2e/DICT`, using Fastify `inject` against a mocked database. Covers entries and key-check flows.
- `apps/spi` — unit tests for `TransactionManager` under `apps/spi/tests/unit`.

Claims and refunds routes have no tests (they are stubs).

## 7. Lint and format

[**Biome**](https://biomejs.dev/) is the linter/formatter, run through Turbo:

```sh
pnpm run lint    # turbo run lint
pnpm run format  # turbo run format (Biome check --apply)
```

Each app also exposes its own `lint` / `format` scripts if you prefer to run Biome directly inside a package.

## 8. Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). **Commitizen is no longer used** — commits are authored (by AI agents or humans) directly as Conventional Commits, with no interactive prompt. (See [ROADMAP.md](../ROADMAP.md#tooling-decisions-decided) "Tooling decisions".)

Git hooks are managed with **Husky** (two hooks only):

- a hook preventing direct commits to the `main` branch;
- a `pre-commit` hook that formats all valid staged files with Biome.

> Hooks are a decided direction; not yet wired up in this repo.

## 9. Docker usage

Build and run the whole monorepo image (API + SPI via turbo):

```sh
docker build -t bacen-simulator .
docker run -p 8080:8080 bacen-simulator
```

The root `compose.yaml` runs **only the API** on port 8080:

```sh
docker compose up
```

Limitations to be aware of:

- **Migrations do not run automatically** in Docker. Run `pnpm run migration` against the running container (or mount a pre-seeded `database.sqlite`) before the API will return meaningful data.
- There is **no single compose file** that brings up API + SPI + Mosquitto together. Use `pnpm run compose:up` (broker) plus turbo (apps) for full local development.

## 10. Project scripts reference

Run from the repo root unless noted.

| Script | What it does |
|---|---|
| `pnpm install` | Install dependencies for all workspaces |
| `pnpm run migration:run` | Create SQLite tables |
| `pnpm run migration:seed` | Seed institutions + test rows |
| `pnpm run migration` | Run migrations then seed |
| `pnpm run dev` | Watch mode across apps (turbo) |
| `pnpm run start` | Run apps once (turbo) |
| `pnpm run test` | Run test suites (turbo; currently Jest, migrating to Vitest) |
| `pnpm run test:watch` | Test watch mode (turbo; currently Jest, migrating to Vitest) |
| `pnpm run lint` | Biome lint (turbo) |
| `pnpm run format` | Biome format / check --apply (turbo) |
| `pnpm run build` | `tsc -p tsconfig.json` |
| `pnpm run compose:up` | Start the Mosquitto broker (`packages/docker`) |
| `pnpm run compose:down` | Stop the broker |

See [ROADMAP.md](../ROADMAP.md) for what is planned next, and [CONTRIBUTING.md](../CONTRIBUTING.md) to get involved.
