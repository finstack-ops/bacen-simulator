# SPI Context — Settlement (prototype)

This context owns the **SPI** (Sistema de Pagamentos Instantâneos) prototype: an in-process payment transaction state machine plus an MQTT echo bot. The `TransactionManager` models a payment as a sequence of ISO 20022 message steps between participants; it is unit-tested but **not yet wired to the broker**. The live runtime (`main.ts`) only connects to Mosquitto and echoes messages. This context does NOT own DICT/key resolution, XMLDSig/mTLS, the RSFN transport, or any persistence — transactions are in-memory only.

## Glossary

- **Transaction** — one payment modeled as a state machine. Interface `Transaction` (`transactions/types.ts`): `id`, `type`, `created_at`, `current_step`, `total_steps`. Held in-memory in `TransactionManager.transactions`, keyed by `id`.
- **TransactionManager** — the class (`transactions/index.ts`) that creates, advances, and expires Transactions. The central unit of this context.
- **TransactionTypes** — enum (`types.ts`); only `CREATE_PAYMENT` is implemented. The constructor's `possible_transactions` map defines the step graph per type.
- **TransactionParticipants** — enum (`types.ts`): `SPI`, `PSP_1`, `PSP_2`, `EVERY_ONE`, `EVERY_PSP`. `SPI` is the settlement rail; `PSP_1`/`PSP_2` are the payer/payee institutions. (`EVERY_PSP` is used in steps; `EVERY_ONE` is declared but unused.)
- **PossibleMessages** — enum (`types.ts`) of ISO 20022 message types: `PACS_008`, `PACS_002`, `PACS_004`, `ADMI_002`, `PIBR_001`, `PIBR_002`. Only `PACS_004` and `PACS_002` are referenced by the `CREATE_PAYMENT` steps today; `PACS_008` (the payment order) is declared but not yet wired into any flow.
- **TransactionSteps** — the ordered step graph for a type (`types.ts`). Each step is `{ participants_owner (emitter), participant_destiny (receiver), message }`. For `CREATE_PAYMENT` the four implemented steps are:
  1. `PACS_004`, `PSP_1` → `SPI`
  2. `PACS_004`, `SPI` → `PSP_2`
  3. `PACS_002`, `PSP_2` → `SPI`
  4. `PACS_002`, `SPI` → `EVERY_PSP`

  > ⚠️ This diverges from the documented intent (a `pacs.008` payment order followed by `pacs.002`/`pacs.004`); the code currently leads with `PACS_004`. Recorded as-is; see `docs/02-architecture.md`.
- **createTransaction** — method that starts a Transaction at `current_step = 0`; throws if the `id` already exists.
- **continueTransaction** — method that validates an incoming `(emitter, receiver, message)` against the expected step and advances `current_step`; throws `"Received package doest match..."` on mismatch.
- **Timeout** — each Transaction starts a **40-second** (`40000` ms) timer; if it expires before completion, `expiredCallback` fires and the Transaction is deleted.
- **MQTT echo bot** — the live `main.ts`: connects via `MQTT_CONNECTION_STRING`, subscribes to wildcard `#`, and publishes `'Mensagem recebida com sucesso!'` to `<topic>/resposta`. This is the entirety of current runtime behavior.
- **resposta** — the only topic convention today: replies go to the inbound topic plus a `/resposta` suffix. Proper PSP↔SPI topic rules and ACLs are planned (ROADMAP Phase 3).

## Avoided terms

- Don't say "payment", "order", or "transfer" for the state-machine object in code — the identifier is **Transaction** (`createTransaction`/`continueTransaction`).
- Don't say "status" or "phase" — the runtime notion is **current_step** (a 0-based index into `TransactionSteps`).
- Don't say "buyer"/"seller" or "sender"/"receiver" for participants — use **PSP_1** / **PSP_2** (and **SPI** for the rail).
- Don't refer to an ISO 20022 **EndToEndId** / UETR as if it exists — transactions are keyed by an opaque `Transaction.id`; that field is not yet modeled.
- Don't blur the echo **bot** (`main.ts`) with the **TransactionManager** — they are separate halves that are not yet connected.

## Key invariants / states

- A Transaction's lifecycle is purely step-indexed: **created** (`current_step = 0`) → **advancing** (`continueTransaction` increments `current_step`) → **done** (`current_step === total_steps`, `doneCallback` fires, timer cleared, Transaction deleted) **or expired** (40 s timeout → `expiredCallback`, Transaction deleted).
- `continueTransaction` accepts a message only if its `emitter`, `receiver`, and `message` exactly match the current step's `participants_owner`, `participant_destiny`, and `message`; anything else throws and the step does not advance.
- Transactions are **in-memory only** — restarting the process loses all state; no persistence exists yet (planned).
- The `TransactionManager` is **not connected to MQTT**: `main.ts` does not feed inbound messages into `createTransaction`/`continueTransaction`. Bridging the two is pending work.
- Only `CREATE_PAYMENT` is implemented; there is no return/cancel/reject flow beyond the hard-coded steps above.

## Where things live

| Concept | Path |
| --- | --- |
| MQTT echo bot / broker connection | `apps/spi/main.ts` |
| TransactionManager (state machine) | `apps/spi/transactions/index.ts` |
| Types/enums (Transaction, Steps, Participants, Messages) | `apps/spi/transactions/types.ts` |
| Unit tests (fake timers) | `apps/spi/tests/unit/transactionManager.test.ts` |
| Broker (Mosquitto) + connection string | `packages/docker/`, `apps/spi/.env.example` (`MQTT_CONNECTION_STRING`) |
| SPI design diagrams | `assets/spi.png`, `assets/flux.png` |
