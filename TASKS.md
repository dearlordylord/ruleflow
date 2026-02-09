# Task Breakdown: PRD 02 — Probabilistic Event Sourcing

## Dependency DAG

```
T1 ──→ T2 ──→ T3 ──────────────────────→ T8 ──→ T9 ──→ T10
                 ↘                       ↗
T4 ──→ T5 ────────→ T6 ──→ T7 ─────────
```

Parallel tracks: {T1, T4} can start simultaneously. T5 can overlap with T2/T3. T6 is the merge point — needs both T3 (systems wrapped) and T5 (ObservationLog exists).

---

## T1: Define ConsistencyWarning and supporting types

**Depends on:** nothing
**Blocked by:** nothing

- Define `ZeroToOne` branded number schema (0–1 range) in `src/domain/entities.ts` or a new `src/domain/warnings.ts`
- Define `ConsistencyWarning` schema class: `{ systemName: SystemName, problem: NonEmptyString, severity: ZeroToOne, affectedEntities: Array<EntityId> }`
- Pure type work, no behavioral changes

**Files:** `src/domain/warnings.ts` (new), possibly `src/domain/entities.ts`

---

## T2: Change System return type and update pipeline

**Depends on:** T1
**Blocked by:** nothing additional

- Change `System<R>` return type from `Chunk<Mutation>` to `{ mutations: Chunk<Mutation>, warnings: Chunk<ConsistencyWarning> }`
- Update `SystemEntry` if needed
- Update `runSystemsPipeline`: accumulate both mutations and warnings across systems, return `{ mutations, warnings }`
- Update `runAllSystems` signature accordingly
- **Does NOT touch individual systems yet** — will cause type errors until T3

**Files:** `src/domain/systems/types.ts`, `src/domain/systems/index.ts`

---

## T3: Wrap all existing systems + fix unit tests

**Depends on:** T2
**Blocked by:** nothing additional

- Every system (28 in registry) wraps its return: `{ mutations: <existing>, warnings: Chunk.empty() }`
- Fix tests that call systems directly or `runSystemsPipeline`:
  - `combat.test.ts` — destructure `{ mutations }` from pipeline results
  - `creatureDiscovery.test.ts` — same
  - `attributes.test.ts` — no system calls, likely unchanged
- After this task, `pnpm tsc --noEmit && pnpm test` must pass with no regressions
- **Does NOT migrate tests that use Committer/Replayer** — that's T9

**Files:** all 28 system files in `src/domain/systems/`, `tests/combat.test.ts`, `tests/creatureDiscovery.test.ts`

---

## T4: Define ObservationEntry types

**Depends on:** nothing
**Blocked by:** nothing

- Define `ObservationEntryId` branded UUID in `src/domain/entities.ts`
- Define `NonNegativeInteger` schema (or reuse if Effect provides one)
- Define `ObservationEntry` schema class:
  ```
  { id: ObservationEntryId,
    timestamp: Date,
    candidates: NonEmptyArray<{ event: DomainEvent, confidence: number }>,
    selectedIndex: NonNegativeInteger | null }
  ```
- Pure types, no services or behavior

**Files:** `src/domain/entities.ts`, `src/domain/infrastructure/ObservationLog.ts` (new, types only initially)

---

## T5: ObservationLog service

**Depends on:** T4
**Blocked by:** nothing additional

- Define `ObservationLog` Effect service (Context.Tag):
  - `append(entry: ObservationEntry) => Effect<void, ObservationLogWriteError>`
  - `read(id: ObservationEntryId) => Effect<ObservationEntry, ObservationEntryNotFound>`
  - `readAll() => Effect<Array<ObservationEntry>>` (ordered by insertion)
  - `updateSelection(id: ObservationEntryId, selectedIndex: NonNegativeInteger | null) => Effect<void, ObservationEntryNotFound>`
- In-memory `testLayer` using `SynchronizedRef<Array<ObservationEntry>>` (array, not map — preserves insertion order for replay)
- Add error types `ObservationLogWriteError`, `ObservationEntryNotFound` to `src/domain/errors.ts`

**Files:** `src/domain/infrastructure/ObservationLog.ts`, `src/domain/errors.ts`

---

## T6: Projector.replayAll

**Depends on:** T3, T5
**Blocked by:** nothing additional

- Create `Projector` Effect service in `src/domain/infrastructure/Projector.ts`
- Implement `replayAll()`:
  1. `ReadModelStore.clear()`
  2. `ObservationLog.readAll()`
  3. For each entry: extract selected event (skip if `selectedIndex === null`), run `runAllSystems(Chunk.of(event))`, apply `.mutations` to GameState
- Derive selected event: `entry.selectedIndex !== null ? entry.candidates[entry.selectedIndex].event : null`
- Add `Projector` testLayer/layer to `src/domain/infrastructure/layers.ts`
- Test: seed ObservationLog with entries, run replayAll, verify state matches expected

**Files:** `src/domain/infrastructure/Projector.ts` (new), `src/domain/infrastructure/layers.ts`, new test file or section

---

## T7: Projector.projectLatest (naive, no candidate evaluation)

**Depends on:** T6
**Blocked by:** nothing additional

- Add `projectLatest(observation: ObservationEntry)` to Projector:
  1. Append observation to ObservationLog
  2. Extract selected event (caller pre-sets `selectedIndex`)
  3. If not null: run `runAllSystems`, apply mutations to GameState
- This is the minimal end-to-end flow: caller constructs ObservationEntry with selectedIndex already chosen
- Test: create observation with one candidate and selectedIndex=0, projectLatest, verify state

**Files:** `src/domain/infrastructure/Projector.ts`

---

## T8: Candidate evaluation in projectLatest

**Depends on:** T7
**Blocked by:** nothing additional (T3 is transitively satisfied via T6)

- Modify `projectLatest` to evaluate candidates when `selectedIndex` is null (or always, per PRD):
  1. For each candidate: snapshot-free evaluation — run `runAllSystems` for candidate's event against **current state** (not committed yet)
  2. Collect `{ mutations, warnings }` per candidate
  3. Score: sum of `warning.severity`. Lower = better. Break ties by `candidate.confidence` (higher = better).
  4. Set `selectedIndex` on the observation entry
  5. Append to log with the selected index
  6. Apply winning mutations

- **Key design question:** running pipeline per candidate requires state to be unchanged between evaluations. Since systems read from ReadModelStore but mutations aren't applied until after selection, this works — each candidate evaluation is read-only against current state, producing candidate mutations. Only the winner's mutations get applied.

- However: `runAllSystems` currently requires `GameState` which wraps `ReadModelStore`. Systems call `state.getEntity()` which reads from store. As long as we don't apply mutations between candidate evaluations, state is consistent. The pipeline itself doesn't mutate state — only `Committer`/`GameState.applyMutation` does. So we just run the pipeline N times (once per candidate) and pick the best result.

- Test: create observation with 2+ candidates, one produces warnings, verify the lower-warning candidate wins. Test tie-breaking by confidence.

**Files:** `src/domain/infrastructure/Projector.ts`, new/expanded test

---

## T9: Layer composition + test migration

**Depends on:** T8
**Blocked by:** nothing additional

- Update `src/domain/infrastructure/layers.ts`:
  - Add `ObservationLog.testLayer` to baseLayer (or its own layer)
  - Add `Projector.layer` (depends on ObservationLog, GameState, AllSystemRequirements)
  - Keep old layers temporarily for T10
- Update `tests/layers.ts`: include ObservationLog + Projector in test layers
- Migrate `tests/simulation.test.ts`: replace `Committer.commit()` with `Projector.projectLatest()` using single-candidate observations
- Migrate `tests/replay.test.ts`: replace `Replayer.replay()` with `Projector.replayAll()`, replace `EventLog` with `ObservationLog`
- All tests must pass: `pnpm tsc --noEmit && pnpm test`

**Files:** `src/domain/infrastructure/layers.ts`, `tests/layers.ts`, `tests/simulation.test.ts`, `tests/replay.test.ts`

---

## T10: Remove old infrastructure

**Depends on:** T9
**Blocked by:** nothing additional

- Delete `src/domain/infrastructure/EventLog.ts`
- Delete `src/domain/infrastructure/Committer.ts`
- Delete `src/domain/infrastructure/Replayer.ts`
- Remove `EventLogEntryId` from `src/domain/entities.ts` (if no remaining references)
- Remove `EventLogWriteError`, `EventLogEntryNotFound` from `src/domain/errors.ts` (if no remaining references)
- Remove re-exports from `src/domain/infrastructure/layers.ts` and `src/domain/systems/index.ts`
- Clean all dead imports across codebase
- `pnpm tsc --noEmit && pnpm lint --fix && pnpm test` must pass

**Files:** deletions + import cleanup across codebase

---

## Notes

- T1 and T4 are fully independent — can be done in any order or simultaneously
- T3 is the most file-touching task (28 system files) but each change is mechanical: wrap return value
- T8 (candidate evaluation) is the architecturally interesting task — all others are plumbing
- Warning logic *within* systems (making them emit real warnings instead of `Chunk.empty()`) is future work, not scoped here. T3 leaves all systems with empty warnings.
- The current `Replayer` requires re-seeding initial entity state manually before replay. The new `Projector.replayAll` has the same limitation unless entity creation is captured as events (it is — `CreatureDiscovered` → `CreateEntity` mutation). Character creation events also produce entity setup. The PRD's "replay from genesis" assumes all state derives from events.
- `EventLog` currently has no `readAll`. `ObservationLog` needs one (for `replayAll`). This is a new requirement — the in-memory impl uses Array (ordered) not Map.
