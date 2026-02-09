# PRD: Probabilistic Event Sourcing for Audio-Transcribed TTRPG Sessions

## Context

This system is an event-sourced ECS (Entity Component System) for tracking Old-School Renaissance tabletop RPG sessions. The domain model captures what happens at the table: attacks, damage, item discovery, spell casting, etc. Events represent the **player's perspective** — what the DM announces, what players declare — not an omniscient world state.

### Current architecture

```
DomainEvent → Systems Pipeline → Mutations → GameState → ReadModelStore
     ↓
  EventLog (append-only, source of truth)
```

- **Events** are immutable, Schema-validated, represent observable in-game actions.
- **Systems** are pure functions: `(ReadonlyGameState, events, accumulatedMutations) → Effect<Chunk<Mutation>, Chunk<DomainError>>`. They encode game rules. They run sequentially; downstream systems can read upstream mutations.
- **Mutations** are atomic state changes applied to the read model.
- **Committer** writes to EventLog + applies mutations atomically.
- **Replayer** rebuilds state by iterating the EventLog and re-running systems.

~40 domain event types, ~30 mutation types, 50+ component types, 24+ systems.

## Problem

Two problems arise from the intended use case: live audio transcription of TTRPG sessions.

### 1. Events are probabilistic

Events aren't typed by a human. They come from audio transcription of the DM and players speaking. Each "moment" in the transcript produces **multiple candidate interpretations**, each with a confidence score. The top candidate might be wrong. A candidate might not be a valid game event at all (transcription artifact). The system must track candidates and allow the selection to change.

### 2. The DM can backtrack

The DM might say "actually, that was 3 damage, not 5" or "wait, that attack shouldn't have hit." This is a domain-level correction — the DM revising a previous ruling. This is distinct from transcription error (infrastructure-level). Both require the ability to revise history, but for different reasons and at different layers.

## Decisions

### ObservationLog replaces EventLog as source of truth

The fundamental data unit changes from a single committed event to an **observation**: a set of ranked candidates from one transcription moment.

```typescript
ObservationEntry {
  id: ObservationEntryId,
  timestamp: Date,
  candidates: NonEmptyArray<{ event: DomainEvent, confidence: number }>,
  selectedIndex: NonNegativeInteger | null  // null = "nothing happened" interpretation
}
```

The "domain event stream" is a derived view: `observations.map(o => selectedEvent(o)).filter(notNull)`. Systems consume this derived stream. They never see observations or candidates.

All candidates are proper `DomainEvent` types — no raw/unstructured fallback. If transcription can't map to a known event shape, it doesn't produce a candidate.

### System return type gains a warning channel

Systems currently return mutations or fail with errors. We add a **warning** channel for soft signals — "this event is processable but suspicious."

```typescript
type System<R> = (
  state: ReadonlyGameState,
  events: Chunk<DomainEvent>,
  accumulatedMutations: Chunk<Mutation>
) => Effect<
  { mutations: Chunk<Mutation>, warnings: Chunk<ConsistencyWarning> },
  Chunk<DomainError>,
  R
>
```

```typescript
ConsistencyWarning {
  systemName: SystemName,
  problem: NonEmptyString,         // human-readable: "Attacker has no equipped weapon"
  severity: ZeroToOne,                // 0–1, where 1 = almost certainly wrong
  affectedEntities: Array<EntityId>
}
```

Warnings come from the systems where the domain knowledge already lives. `combatToHitSystem` knows weapon rules, so it emits weapon-related warnings. This avoids splitting domain logic across systems.

An event can trigger multiple warnings from multiple systems, each with its own severity and explanation. The selection layer consumes the full list.

Systems never reject events based on rule violations. **Rule Zero: the DM is always right.** An event that violates rules still produces mutations. It just also produces warnings.

### Eager candidate selection using system feedback

On each new observation:

1. Run the full systems pipeline for each candidate independently.
2. Collect `{ mutations, warnings }` per candidate.
3. Select the candidate with the lowest warning burden (e.g., sum of severities). Break ties by transcription confidence.
4. Record `selectedIndex` in ObservationEntry.
5. Apply the winning candidate's mutations to ReadModelStore.

This creates a feedback loop: transcription proposes candidates, game-rule-aware systems score them, the best candidate wins. The system's domain knowledge directly improves transcription accuracy.

### Manual-only re-roll with full replay

When a human changes `selectedIndex` on any observation:

1. `ReadModelStore.clear()`
2. Replay the entire ObservationLog: iterate entries, take each selected event, run systems pipeline, apply mutations.

No candidate re-evaluation on other observations during re-roll — just replay with their existing selections. Each observation is evaluated independently.

No snapshots, no incremental replay, no optimization. Full replay from genesis every time. Correct and simple.

### Projector replaces Committer and Replayer

The `Committer` (atomic EventLog + ReadModel write) and `Replayer` (rebuild from EventLog) are replaced by a single `Projector`:

- **`projectLatest(observation)`** — evaluate candidates, select best, append to ObservationLog, apply mutations to ReadModelStore. Used on new observation arrival.
- **`replayAll()`** — clear ReadModelStore, iterate entire ObservationLog, run pipeline for each selected event, apply mutations. Used on re-roll and recovery.

The ReadModelStore is a rebuildable cache. If it gets corrupted or diverges, `replayAll()` recovers. The ObservationLog is the only durable write that matters for correctness.

### Pipeline runs all systems for every event

All systems run on every event. Systems self-filter internally (e.g., `combatToHitSystem` only processes `AttackPerformed` events, returns empty for everything else). This applies to candidate evaluation too — each candidate runs through the full pipeline regardless of event type.

### What stays unchanged

- Entity/component model, branded types, component registry
- All mutation types and `GameState.applyMutation` dispatch
- ReadModelStore interface
- All existing system logic (initially wrapped in `{ mutations: existingResult, warnings: Chunk.empty() }`)
- All domain event types
- Pure services (CombatResolver, DiceRoller, Templates, IdGenerator)

## Alternatives considered and discarded

### Compensating events for transcription corrections

**Pattern:** Append a reversal event (e.g., `DamageCorrected { originalEventId, newAmount }`) to undo a previous event's effects.

**Why discarded:** Compensating events make sense for domain-level corrections (DM revises a ruling). They do not make sense for transcription noise. Transcription errors are infrastructure, not domain. Recording "we misheard the audio" as a domain event pollutes the event log with technical noise that has no business meaning. The ObservationLog approach handles this at the right layer — the candidate selection changes, not the domain event stream.

**Note:** Compensating events remain the right pattern for genuine DM corrections ("actually that was 3 damage, not 5") that happen *after* a selection is committed and confirmed. These are real domain events. This PRD does not address DM correction events specifically; they can coexist with the observation model.

### Hash-chain for tracking selected path

**Pattern:** Maintain a rolling hash: `hash(hash(hash(seed, event1), event2), event3)`. The single hash identifies the entire selected chain. Reconstruct selections by trying each candidate at each observation until the hash matches.

**Why discarded:** Functions as an integrity/identity mechanism, not a selection or storage mechanism. Can't random-access "what was selected at observation N" without replaying from the start. If a candidate set changes (new transcription data), the hash invalidates from that point forward even if the selection didn't change semantically. An explicit `selectedIndex` per observation is simpler and provides direct access. A hash could serve as a version fingerprint on top, but adds complexity without solving a problem we currently have.

### Separate tail consistency-checking system

**Pattern:** Add a `consistencyValidationSystem` at the end of the pipeline that reads all events and accumulated mutations and emits warnings holistically.

**Why discarded:** Concentrates all domain knowledge in one system. Splits domain logic: `combatToHitSystem` would know how to process attacks, but `consistencyValidationSystem` would separately know what makes an attack suspicious. The knowledge should live where it naturally belongs — each system warns about its own domain.

### Particle filtering / N parallel world states

**Pattern:** Maintain top-K most likely world states simultaneously. Each new observation forks each state with each candidate, prune unlikely branches.

**Why discarded (for now):** Over-engineered for the initial version. With eager selection and full replay on re-roll, we get correctness without the complexity of maintaining parallel states. The architecture supports adding this later — `replayAll()` with different selections is equivalent to exploring alternative branches. See "Future considerations."

### GameState snapshots for efficient replay

**Pattern:** Snapshot the ReadModelStore at regular intervals. On re-roll, replay from the nearest snapshot rather than from genesis.

**Why discarded (for now):** Performance optimization. Start without it. If replay becomes too slow, add snapshots at observation boundaries. The architecture is snapshot-friendly — `ReadModelStore` is serializable, snapshots are just periodic saves.

## Future considerations

These are explicitly deferred. The architecture accommodates them without structural changes.

### Automatic re-roll

Currently, only humans change selections. A future addition: after projecting a new observation, check if its warnings make a *previous* observation's selection implausible. If so, automatically re-evaluate that observation's candidates and re-roll if a better candidate exists. Triggers `replayAll()`.

This is a new caller of existing `ObservationLog.updateSelection()` + `Projector.replayAll()` — no architectural change needed, just a new decision-making layer.

### Cross-observation warning correlation

Currently, each observation is evaluated independently. Future: consider context across observations. E.g., observation 5 warns "entity has no weapon equipped," then observation 6's best candidate is `WeaponEquipped` — this retroactively reduces concern about observation 5. Would require re-evaluation of previous observations when new context arrives. Pairs with automatic re-roll.

### Warning persistence

Currently, warnings are transient — computed during selection, not stored. Future: store warnings alongside observations for review without replay. Adds a field to `ObservationEntry` but doesn't change the flow.

### Commitment horizons

Currently, re-roll can cascade to any point in history and triggers full replay. Future: introduce a "commitment horizon" past which selections are frozen. Reduces replay scope and provides a notion of "confirmed history." Would require a `committedUpTo: ObservationEntryId` pointer in the ObservationLog.

### Snapshots

Periodic GameState snapshots at observation boundaries. On re-roll, replay from nearest snapshot before the changed observation. Reduces replay cost from O(N) to O(N-K) where K is the snapshot position.
