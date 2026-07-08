# Contributing

Thanks for your interest in `bacen-simulator`. This is a maintained fork of the original at [github.com/eletroswing/bacen-simulator](https://github.com/eletroswing/bacen-simulator).

## Fork, clone, branch

First, fork the project on GitHub (and click the star 🌟 if you like it). Then:

```sh
git clone https://github.com/finstack-ops/bacen-simulator BacenSimulator
cd BacenSimulator
git checkout -b your-branch-name
```

> If you cloned the upstream `eletroswing/bacen-simulator`, add your fork as a remote and push there.

## Setup

For the full setup — prerequisites, install, migrations, running the API and SPI, the Mosquitto broker, tests, lint, and Docker — see **[docs/03-development.md](docs/03-development.md)**. The short version:

```sh
pnpm install
pnpm run migration        # create tables + seed
pnpm run dev              # turbo dev across apps
```

The SPI app additionally needs a running Mosquitto broker (`pnpm run compose:up`) and an `apps/spi/.env` file — see the development guide for the port caveat.

## Tests

We provide end-to-end and unit tests so you can verify your changes:

```sh
pnpm run test
pnpm run test:watch
```

## Making the commit

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are authored directly (no interactive prompt tooling). Stage with `git add`, then commit:

```sh
git commit -m "feat(api): add claim lifecycle"
```

Push to your fork and open a pull request against `finstack-ops/bacen-simulator`. Planned Git hooks (branch protection, Biome pre-commit) are tracked in [ROADMAP.md](ROADMAP.md).

## Where to find work

- Check [ROADMAP.md](ROADMAP.md) for the project's direction and planned work.
- Browse [GitHub issues](https://github.com/finstack-ops/bacen-simulator/issues) for open tasks.
- Historical context and older discussions live on the upstream repo: [eletroswing/bacen-simulator/issues](https://github.com/eletroswing/bacen-simulator/issues).
