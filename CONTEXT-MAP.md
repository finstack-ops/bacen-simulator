# Context Map

This is a multi-context repo (Turborepo monorepo). Each context has its own `CONTEXT.md` with domain language and its own `docs/adr/` for context-scoped decisions. System-wide ADRs live in `docs/adr/` at the repo root.

| Context | Path | CONTEXT.md | Description |
| --- | --- | --- | --- |
| API | `apps/api` | [`apps/api/CONTEXT.md`](apps/api/CONTEXT.md) | DICT-facing HTTP API |
| SPI | `apps/spi` | [`apps/spi/CONTEXT.md`](apps/spi/CONTEXT.md) | SPI transaction manager service |

`packages/infra` and `packages/docker` are shared infrastructure, not bounded contexts — no `CONTEXT.md` expected there.
