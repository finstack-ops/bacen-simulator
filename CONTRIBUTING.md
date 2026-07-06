# Contributing

Thanks for your interest in `bacen-simulator`. This is a maintained fork of the original at [github.com/eletroswing/bacen-simulator](https://github.com/eletroswing/bacen-simulator).

## Fork, clone, branch

First, fork the project on GitHub (and click the star 🌟 if you like it). Then:

```sh
git clone https://github.com/gustav0d/bacen-simulator BacenSimulator
cd BacenSimulator
git checkout -b your-branch-name
```

> If you cloned the upstream `eletroswing/bacen-simulator`, add your fork as a remote and push there.

## Setup

For the full setup — prerequisites, install, migrations, running the API and SPI, the Mosquitto broker, tests, lint, and Docker — see **[docs/03-development.md](docs/03-development.md)**. The short version:

```sh
npm ci
npm run migration        # create tables + seed
npm run dev              # turbo dev across apps
```

The SPI app additionally needs a running Mosquitto broker (`npm run compose:up`) and an `apps/spi/.env` file — see the development guide for the port caveat.

## Tests

We provide end-to-end and unit tests so you can verify your changes:

```sh
npm run test
npm run test:watch
```

## Making the commit

This repo uses [Commitizen](https://github.com/commitizen/cz-cli) with conventional commits. After `git add`-ing your changes, run:

```sh
npm run commit
```

Follow the prompts to build a conventional-commit message, then push to your fork and open a pull request against `gustav0d/bacen-simulator`.

## Where to find work

- Check [ROADMAP.md](ROADMAP.md) for the project's direction and planned work.
- Browse [GitHub issues](https://github.com/gustav0d/bacen-simulator/issues) for open tasks.
- Historical context and older discussions live on the upstream repo: [eletroswing/bacen-simulator/issues](https://github.com/eletroswing/bacen-simulator/issues).
