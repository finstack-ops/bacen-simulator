## Agent skills

### Issue tracker

Issues are tracked on GitHub (`gustav0d/bacen-simulator`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to per-app `CONTEXT.md` files under `apps/api/` and `apps/spi/`. See `docs/agents/domain.md`.

### Sourcing policy

Any factual claim about BACEN, Pix, DICT, or SPI added to this repo's docs must cite a source. Prefer official Brazilian government institutions — Banco Central (bcb.gov.br) first, then other gov.br/planalto legislation sources. Never assume or invent regulatory facts (version numbers, dates, normativo numbers, message semantics) — verify them against an official source before writing them down. Record every new source in `docs/references.md`, grouped by topic, noting the claim it backs and its version/date; if only a non-official (secondary) source is available, mark it as such and prefer swapping in an official one later.
