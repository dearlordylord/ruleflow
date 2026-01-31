# Functional Event-Sourced ECS Architecture with Effect.ts

Research findings for implementing a TypeScript functional game engine using Effect.ts ecosystem.

## 1. Monadic Validation Chain

### Effect.validateAll - Accumulate All Mutations

`Effect.validateAll` runs all validations and accumulates **all** errors (or mutations) rather than short-circuiting on first failure:

```typescript
import { Effect, Schema, Chunk } from "effect"

const EntityId = Schema.UUID.pipe(Schema.brand("EntityId"))
type EntityId = typeof EntityId.Type

const SystemName = Schema.NonEmptyString.pipe(Schema.brand("SystemName"))
type SystemName = typeof SystemName.Type
class PositionComponent extends Schema.Class<PositionComponent>("Position")({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number
}) {}

class HealthComponent extends Schema.Class<HealthComponent>("Health")({
  current: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  max: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

class InventoryComponent extends Schema.Class<InventoryComponent>("Inventory")({
  items: Schema.Array(EntityId),
  capacity: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

const Component = Schema.Union(PositionComponent, HealthComponent, InventoryComponent)
type Component = typeof Component.Type

type ComponentTag = Component["_tag"]
class SetPositionMutation extends Schema.TaggedClass<SetPositionMutation>()(
  "SetPosition",
  {
    entityId: EntityId,
    data: Schema.Struct(PositionComponent.fields).pipe(Schema.partial)
  }
) {}

class SetHealthMutation extends Schema.TaggedClass<SetHealthMutation>()(
  "SetHealth",
  {
    entityId: EntityId,
    data: Schema.Struct(HealthComponent.fields).pipe(Schema.partial)
  }
) {}

class SetInventoryMutation extends Schema.TaggedClass<SetInventoryMutation>()(
  "SetInventory",
  {
    entityId: EntityId,
    data: Schema.Struct(InventoryComponent.fields).pipe(Schema.partial)
  }
) {}

class RemoveComponentMutation extends Schema.TaggedClass<RemoveComponentMutation>()(
  "RemoveComponent",
  {
    entityId: EntityId,
    componentTag: Schema.Literal("Position", "Health", "Inventory")
  }
) {}

const Mutation = Schema.Union(
  SetPositionMutation,
  SetHealthMutation,
  SetInventoryMutation,
  RemoveComponentMutation
)
type Mutation = typeof Mutation.Type

class DomainError extends Schema.TaggedError<DomainError>()(
  "DomainError",
  {
    systemName: SystemName,
    message: Schema.NonEmptyString
  }
) {}

type SystemResult = Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>>
const runSystems = (
  systems: Array<SystemResult>
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>> =>
  Effect.validateAll(systems, { concurrency: "unbounded" }).pipe(
    Effect.map(Chunk.flatten)
  )
const encumbranceSystem: SystemResult = Effect.succeed(Chunk.of(
  SetInventoryMutation.make({
    entityId: EntityId.make("550e8400-e29b-41d4-a716-446655440000"),
    data: { capacity: 50 }
  })
))

const cooldownSystem: SystemResult = Effect.fail(Chunk.of(
  DomainError.make({
    systemName: SystemName.make("Cooldown"),
    message: "Ability on cooldown"
  })
))

const rangeSystem: SystemResult = Effect.fail(Chunk.of(
  DomainError.make({
    systemName: SystemName.make("Range"),
    message: "Target out of range"
  })
))

const result = runSystems([encumbranceSystem, cooldownSystem, rangeSystem])
```

### Effect.partition - Separate Successes from Failures

When you want to **continue processing** even with some failures, use `Effect.partition`:

```typescript
import { Effect, Chunk } from "effect"

const runSystemsPartial = (
  systems: Array<SystemResult>
): Effect.Effect<[Chunk.Chunk<DomainError>, Chunk.Chunk<Mutation>]> =>
  Effect.partition(systems, (system) => system).pipe(
    Effect.map(([errors, mutations]) => [
      Chunk.flatten(errors),
      Chunk.flatten(mutations)
    ])
  )

// Example: get mutations from successful systems, log failures
const program = Effect.gen(function* () {
  const [errors, mutations] = yield* runSystemsPartial([
    encumbranceSystem,
    cooldownSystem,
    rangeSystem
  ])

  yield* Effect.logWarning(`${errors.length} systems failed`)
  yield* applyMutations(mutations)

  return errors.length === 0
})
```

### Passing Evolved State Through Pipeline

Use **Context** to pass evolving state without threading parameters:

```typescript
import { Context, Effect, Chunk, Schema } from "effect"

class Entity extends Schema.Class<Entity>("Entity")({
  id: EntityId,
  components: Schema.HashMap({
    key: Schema.Literal("Position", "Health", "Inventory"),
    value: Component
  })
}) {}

class EntityNotFound extends Schema.TaggedError<EntityNotFound>()(
  "EntityNotFound",
  { id: EntityId }
) {}

class GameState extends Context.Tag("@game/State")<
  GameState,
  {
    readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly applyMutation: (m: Mutation) => Effect.Effect<void>
  }
>() {}

const encumbranceSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const playerId = EntityId.make("550e8400-e29b-41d4-a716-446655440000")
    const player = yield* state.getEntity(playerId).pipe(
      Effect.mapError(() =>
        DomainError.make({
          systemName: SystemName.make("Encumbrance"),
          message: "Player not found"
        })
      )
    )

    const inventory = HashMap.get(player.components, "Inventory")
    if (Option.isNone(inventory)) {
      return yield* Effect.fail(Chunk.of(
        DomainError.make({
          systemName: SystemName.make("Encumbrance"),
          message: "No inventory"
        })
      ))
    }

    const hasInventoryUpdate = Chunk.some(
      pendingMutations,
      (m) => m._tag === "SetInventory" && m.entityId === playerId
    )

    if (hasInventoryUpdate) {
      return Chunk.empty()
    }

    return Chunk.of(
      SetInventoryMutation.make({
        entityId: playerId,
        data: { weight: 50 }
      })
    )
  })

type System = (
  state: ReadonlyGameState,
  pendingMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>>

interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

// Run systems sequentially, accumulating mutations
const runSystemsPipeline = (
  systems: Array<System>
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function* () {
    const state = yield* GameState

    return yield* Effect.reduce(
      systems,
      Chunk.empty<Mutation>(),
      (accumulatedMutations, system) =>
        Effect.gen(function* () {
          const newMutations = yield* system(state, accumulatedMutations)
          return Chunk.appendAll(accumulatedMutations, newMutations)
        })
    )
  })
```

## 2. Schema and Component Modeling

### Entities and Components as Tagged Unions

```typescript
import { Schema, HashMap } from "effect"

const EntityId = Schema.UUID.pipe(Schema.brand("EntityId"))
type EntityId = typeof EntityId.Type

const TemplateId = Schema.UUID.pipe(Schema.brand("TemplateId"))
type TemplateId = typeof TemplateId.Type
class PositionComponent extends Schema.Class<PositionComponent>("Position")({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number
}) {}

class HealthComponent extends Schema.Class<HealthComponent>("Health")({
  current: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  max: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

class InventoryComponent extends Schema.Class<InventoryComponent>("Inventory")({
  items: Schema.Array(EntityId),
  capacity: Schema.Int.pipe(Schema.greaterThan(0)),
  weight: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

const Component = Schema.Union(
  PositionComponent,
  HealthComponent,
  InventoryComponent
)
type Component = typeof Component.Type

const ComponentTag = Schema.Literal("Position", "Health", "Inventory")
type ComponentTag = typeof ComponentTag.Type
class Entity extends Schema.Class<Entity>("Entity")({
  id: EntityId,
  templateId: Schema.OptionFromNullOr(TemplateId),
  components: Schema.HashMap({ key: ComponentTag, value: Component })
}) {}
class SetPositionMutation extends Schema.TaggedClass<SetPositionMutation>()(
  "SetPosition",
  {
    entityId: EntityId,
    data: Schema.Struct(PositionComponent.fields).pipe(Schema.partial)
  }
) {}

class SetHealthMutation extends Schema.TaggedClass<SetHealthMutation>()(
  "SetHealth",
  {
    entityId: EntityId,
    data: Schema.Struct(HealthComponent.fields).pipe(Schema.partial)
  }
) {}

class SetInventoryMutation extends Schema.TaggedClass<SetInventoryMutation>()(
  "SetInventory",
  {
    entityId: EntityId,
    data: Schema.Struct(InventoryComponent.fields).pipe(Schema.partial)
  }
) {}

class RemoveComponentMutation extends Schema.TaggedClass<RemoveComponentMutation>()(
  "RemoveComponent",
  {
    entityId: EntityId,
    componentTag: ComponentTag
  }
) {}

const Mutation = Schema.Union(
  SetPositionMutation,
  SetHealthMutation,
  SetInventoryMutation,
  RemoveComponentMutation
)
type Mutation = typeof Mutation.Type
```

### Prototype System with Effect-Based Lookup

```typescript
import { Context, Effect, HashMap, Option, Schema, Layer } from "effect"

class ComponentNotFound extends Schema.TaggedError<ComponentNotFound>()(
  "ComponentNotFound",
  {
    entityId: EntityId,
    componentTag: ComponentTag
  }
) {}

class Templates extends Context.Tag("@game/Templates")<
  Templates,
  {
    readonly resolveComponent: <C extends ComponentTag>(
      entityId: EntityId,
      componentTag: C
    ) => Effect.Effect<
      Extract<Component, { _tag: C }>,
      ComponentNotFound | EntityNotFound
    >
  }
>() {
  static readonly layer = Layer.effect(
    Templates,
    Effect.gen(function* () {
      const state = yield* GameState

      const resolveComponent = <C extends ComponentTag>(
        entityId: EntityId,
        componentTag: C
      ): Effect.Effect<
        Extract<Component, { _tag: C }>,
        ComponentNotFound | EntityNotFound
      > =>
        Effect.gen(function* () {
          const entity = yield* state.getEntity(entityId)

          const instanceComp = HashMap.get(entity.components, componentTag)
          if (Option.isSome(instanceComp)) {
            const value = instanceComp.value
            if (value._tag === componentTag) {
              return value as Extract<Component, { _tag: C }>
            }
          }

          if (Option.isSome(entity.templateId)) {
            return yield* resolveComponent(entity.templateId.value, componentTag)
          }

          return yield* ComponentNotFound.make({
            entityId,
            componentTag
          })
        })

      return Templates.of({ resolveComponent })
    })
  )
}
const getPlayerHealth = Effect.gen(function* () {
  const templates = yield* Templates
  const playerId = EntityId.make("550e8400-e29b-41d4-a716-446655440000")
  const health = yield* templates.resolveComponent(playerId, "Health")
  return health.current
})
```

## 3. Transactional State Updates (The Committer)

### Injectable Services for Testing

All side effects must be injectable for property-based testing:

```typescript
import { Effect, Context, Layer, SynchronizedRef, Exit, Chunk, Schema } from "effect"

const EventLogEntryId = Schema.UUID.pipe(Schema.brand("EventLogEntryId"))
type EventLogEntryId = typeof EventLogEntryId.Type

class EventLogEntry extends Schema.Class<EventLogEntry>("EventLogEntry")({
  id: EventLogEntryId,
  timestamp: Schema.Date,
  mutations: Schema.Array(Mutation)
}) {}

class EventLogWriteError extends Schema.TaggedError<EventLogWriteError>()(
  "EventLogWriteError",
  {
    entryId: EventLogEntryId,
    error: Schema.Defect
  }
) {}

class EventLog extends Context.Tag("@game/EventLog")<
  EventLog,
  {
    readonly append: (
      entry: EventLogEntry
    ) => Effect.Effect<void, EventLogWriteError>
    readonly read: (
      id: EventLogEntryId
    ) => Effect.Effect<EventLogEntry, EntityNotFound>
  }
>() {
  static readonly postgresLayer = Layer.succeed(EventLog, {
    append: (entry) => Effect.logInfo(`[EventLog] Append ${entry.id}`),
    read: (id) => Effect.dieMessage("Not implemented")
  })

  static readonly testLayer = Layer.effect(
    EventLog,
    Effect.gen(function* () {
      const store = yield* SynchronizedRef.make(
        new Map<EventLogEntryId, EventLogEntry>()
      )

      const append = (entry: EventLogEntry) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(entry.id, entry)
          return newMap
        })

      const read = (id: EventLogEntryId) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((map) =>
            Option.match(Option.fromNullable(map.get(id)), {
              onNone: () => EntityNotFound.make({ id }),
              onSome: Effect.succeed
            })
          )
        )

      return EventLog.of({ append, read })
    })
  )
}

class ReadModelStore extends Context.Tag("@game/ReadModelStore")<
  ReadModelStore,
  {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
  }
>() {
  static readonly testLayer = Layer.effect(
    ReadModelStore,
    Effect.gen(function* () {
      const store = yield* SynchronizedRef.make(
        new Map<EntityId, Entity>()
      )

      const get = (id: EntityId) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((map) =>
            Option.match(Option.fromNullable(map.get(id)), {
              onNone: () => EntityNotFound.make({ id }),
              onSome: Effect.succeed
            })
          )
        )

      const set = (entity: Entity) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(entity.id, entity)
          return newMap
        })

      const update = (id: EntityId, f: (entity: Entity) => Effect.Effect<Entity>) =>
        SynchronizedRef.updateEffect(store, (map) =>
          Effect.gen(function* () {
            const entity = Option.fromNullable(map.get(id))
            if (Option.isNone(entity)) {
              return yield* EntityNotFound.make({ id })
            }
            const updated = yield* f(entity.value)
            const newMap = new Map(map)
            newMap.set(id, updated)
            return newMap
          })
        )

      return ReadModelStore.of({ get, set, update })
    })
  )
}

class Committer extends Context.Tag("@game/Committer")<
  Committer,
  {
    readonly commit: (
      mutations: Chunk.Chunk<Mutation>
    ) => Effect.Effect<EventLogEntry, EventLogWriteError>
  }
>() {
  static readonly layer = Layer.effect(
    Committer,
    Effect.gen(function* () {
      const eventLog = yield* EventLog
      const readModelStore = yield* ReadModelStore

      const commit = (mutations: Chunk.Chunk<Mutation>) =>
        Effect.acquireUseRelease(
          Effect.sync(() =>
            EventLogEntry.make({
              id: EventLogEntryId.make(crypto.randomUUID()),
              timestamp: new Date(),
              mutations: Array.from(mutations)
            })
          ),
          (entry) =>
            eventLog.append(entry).pipe(
              Effect.zipRight(
                Effect.forEach(mutations, (mutation) =>
                  applyMutationToStore(readModelStore, mutation)
                )
              ),
              Effect.map(() => entry)
            ),
          (entry, exit) =>
            Exit.isFailure(exit)
              ? Effect.logError(`Failed to commit ${entry.id}`)
              : Effect.void
        )

      return Committer.of({ commit })
    })
  )
}

const applyMutationToStore = (
  store: ReadModelStore,
  mutation: Mutation
): Effect.Effect<void, EntityNotFound> =>
  Effect.gen(function* () {
    if (mutation._tag === "RemoveComponent") {
      yield* store.update(mutation.entityId, (entity) =>
        Effect.succeed(
          Entity.make({
            ...entity,
            components: HashMap.remove(entity.components, mutation.componentTag)
          })
        )
      )
    } else {
      const component = createComponentFromMutation(mutation)
      yield* store.update(mutation.entityId, (entity) =>
        Effect.succeed(
          Entity.make({
            ...entity,
            components: HashMap.set(entity.components, component._tag, component)
          })
        )
      )
    }
  })
```

### Replay Mechanism - Rebuilding State from Event Log

When server restarts, ECS state must be reconstructed from Event Log. The Replay function streams event log entries and applies all mutations to rebuild the SynchronizedRef:

```typescript
import { Stream, Effect, SynchronizedRef, HashMap } from "effect"

class Replayer extends Context.Tag("@game/Replayer")<
  Replayer,
  {
    readonly replay: (
      entries: Array<EventLogEntry>
    ) => Effect.Effect<void, EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    Replayer,
    Effect.gen(function* () {
      const state = yield* GameState

      const replay = (entries: Array<EventLogEntry>) =>
        Stream.fromIterable(entries).pipe(
          Stream.mapEffect((entry) =>
            Effect.forEach(entry.mutations, (mutation) =>
              state.applyMutation(mutation)
            )
          ),
          Stream.runDrain
        )

      return Replayer.of({ replay })
    })
  )
}

const replayFromEventLog = (
  eventLogEntries: Array<EventLogEntry>
): Effect.Effect<void, EntityNotFound, GameState> =>
  Effect.gen(function* () {
    const state = yield* GameState

    yield* Stream.fromIterable(eventLogEntries).pipe(
      Stream.flatMap((entry) => Stream.fromIterable(entry.mutations)),
      Stream.mapEffect((mutation) => state.applyMutation(mutation)),
      Stream.runDrain
    )
  })
```

### Server Restart Flow

Complete initialization sequence for server restart:

```typescript
class EventLogReader extends Context.Tag("@game/EventLogReader")<
  EventLogReader,
  {
    readonly getAllEntries: () => Effect.Effect<Array<EventLogEntry>>
  }
>() {
  static readonly postgresLayer = Layer.succeed(EventLogReader, {
    getAllEntries: () =>
      Effect.logInfo("SELECT * FROM event_log ORDER BY timestamp").pipe(
        Effect.map(() => [])
      )
  })

  static readonly testLayer = Layer.effect(
    EventLogReader,
    Effect.gen(function* () {
      const eventLog = yield* EventLog

      const getAllEntries = () =>
        Effect.succeed([])

      return EventLogReader.of({ getAllEntries })
    })
  )
}

const serverBootstrap = Effect.gen(function* () {
  yield* Effect.logInfo("Server starting...")

  const readModelStore = yield* ReadModelStore
  const eventLogReader = yield* EventLogReader

  const allEntries = yield* eventLogReader.getAllEntries()
  yield* Effect.logInfo(`Replaying ${allEntries.length} event log entries`)

  yield* Stream.fromIterable(allEntries).pipe(
    Stream.mapEffect((entry) =>
      Effect.forEach(entry.mutations, (mutation) =>
        Effect.gen(function* () {
          const state = yield* GameState
          yield* state.applyMutation(mutation)
        })
      )
    ),
    Stream.runDrain
  )

  yield* Effect.logInfo("Replay complete. Server ready.")
})

const productionBootstrapLayer = Layer.mergeAll(
  EventLog.postgresLayer,
  EventLogReader.postgresLayer,
  ReadModelStore.testLayer,
  GameState.layer,
  Committer.layer
)

const bootProgram = serverBootstrap.pipe(
  Effect.provide(productionBootstrapLayer)
)
```

### Type-Safe Mutation Streaming

Stream mutations with full type safety:

```typescript
const replayWithLogging = (
  entries: Array<EventLogEntry>
): Effect.Effect<number, EntityNotFound, GameState> =>
  Stream.fromIterable(entries).pipe(
    Stream.mapEffect((entry) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(`Replaying entry ${entry.id}`)

        const mutationCount = yield* Stream.fromIterable(entry.mutations).pipe(
          Stream.mapEffect((mutation) =>
            Effect.gen(function* () {
              const state = yield* GameState
              yield* state.applyMutation(mutation)
              return 1
            })
          ),
          Stream.runSum
        )

        return mutationCount
      })
    ),
    Stream.runSum
  )
```

### Incremental Replay with Checkpoints

For large event logs, checkpoint last replayed entry:

```typescript
class ReplayCheckpoint extends Schema.Class<ReplayCheckpoint>("ReplayCheckpoint")({
  lastReplayedEntryId: EventLogEntryId,
  timestamp: Schema.Date
}) {}

const replayFromCheckpoint = (
  checkpoint: Option.Option<ReplayCheckpoint>
): Effect.Effect<void, EntityNotFound, GameState | EventLogReader> =>
  Effect.gen(function* () {
    const reader = yield* EventLogReader
    const state = yield* GameState

    const allEntries = yield* reader.getAllEntries()

    const entriesToReplay = Option.match(checkpoint, {
      onNone: () => allEntries,
      onSome: (cp) =>
        allEntries.filter((entry) =>
          entry.timestamp > cp.timestamp
        )
    })

    yield* Stream.fromIterable(entriesToReplay).pipe(
      Stream.mapEffect((entry) =>
        Effect.forEach(entry.mutations, (mutation) =>
          state.applyMutation(mutation)
        )
      ),
      Stream.runDrain
    )
  })
```

### GameState Layer Implementation

Complete injectable GameState implementation:

```typescript
import { SynchronizedRef, Effect, Layer, HashMap, Option } from "effect"

class GameState extends Context.Tag("@game/State")<
  GameState,
  {
    readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly applyMutation: (mutation: Mutation) => Effect.Effect<void>
  }
>() {
  static readonly layer = Layer.effect(
    GameState,
    Effect.gen(function* () {
      const entities = yield* SynchronizedRef.make(
        new Map<EntityId, Entity>()
      )

      const applyMutation = (mutation: Mutation) =>
        SynchronizedRef.updateEffect(entities, (state) =>
          Effect.gen(function* () {
            const newState = new Map(state)
            const entity = newState.get(mutation.entityId)

            if (!entity) {
              return yield* EntityNotFound.make({ id: mutation.entityId })
            }

            if (mutation._tag === "RemoveComponent") {
              entity.components = HashMap.remove(
                entity.components,
                mutation.componentTag
              )
            } else {
              const component = createComponentFromMutation(mutation)
              entity.components = HashMap.set(
                entity.components,
                component._tag,
                component
              )
            }

            yield* validateEntityInvariants(entity)

            return newState
          })
        )

      const getEntity = (id: EntityId) =>
        SynchronizedRef.get(entities).pipe(
          Effect.flatMap((state) =>
            Option.match(Option.fromNullable(state.get(id)), {
              onNone: () => EntityNotFound.make({ id }),
              onSome: Effect.succeed
            })
          )
        )

      return GameState.of({ getEntity, applyMutation })
    })
  )
}
```

## 4. Handling Cascading Mutations

### Fix-Up Pattern: Prepending Mutations Functionally

Instead of mutation side effects, **return additional mutations** from validation logic:

```typescript
import { Chunk, Effect, HashMap, Option, Schema } from "effect"

const SlotName = Schema.Literal("mainHand", "offHand", "head", "chest")
type SlotName = typeof SlotName.Type

class EquippedComponent extends Schema.Class<EquippedComponent>("Equipped")({
  slot: SlotName
}) {}

const makeAssignItemSystem = (
  itemId: EntityId,
  targetSlot: SlotName
): System =>
  (state, pendingMutations) =>
    Effect.gen(function* () {
      const playerId = EntityId.make("550e8400-e29b-41d4-a716-446655440000")
      const player = yield* state.getEntity(playerId).pipe(
        Effect.mapError(() =>
          DomainError.make({
            systemName: SystemName.make("AssignItem"),
            message: "Player not found"
          })
        )
      )

      const inventory = HashMap.get(player.components, "Inventory")
      if (Option.isNone(inventory)) {
        return yield* Effect.fail(Chunk.of(
          DomainError.make({
            systemName: SystemName.make("AssignItem"),
            message: "No inventory component"
          })
        ))
      }

      const hasUnassignPending = Chunk.some(
        pendingMutations,
        (m) =>
          m._tag === "RemoveComponent" &&
          m.componentTag === "Equipped"
      )

      let mutations = Chunk.empty<Mutation>()

      const currentItemInSlot: EntityId | null = null

      if (currentItemInSlot !== null && !hasUnassignPending) {
        mutations = Chunk.prepend(
          mutations,
          RemoveComponentMutation.make({
            entityId: currentItemInSlot,
            componentTag: "Equipped"
          })
        )
      }

      mutations = Chunk.append(
        mutations,
        SetInventoryMutation.make({
          entityId: itemId,
          data: { /* equipped slot data */ }
        })
      )

      return mutations
    })
```

### Stream-Based Mutation Pipeline

For complex cascading logic, use `Stream` to process mutations reactively:

```typescript
import { Stream, Chunk, Effect } from "effect"

const processMutationsReactive = (
  initialMutations: Chunk.Chunk<Mutation>
): Effect.Effect<Chunk.Chunk<Mutation>, never, GameState> =>
  Stream.fromIterable(initialMutations).pipe(
    Stream.mapEffect((mutation) =>
      Effect.gen(function* () {
        const state = yield* GameState

        yield* state.applyMutation(mutation)

        const cascaded = yield* checkCascadingEffects(mutation)

        return Chunk.prepend(cascaded, mutation)
      })
    ),
    Stream.flatMap(Stream.fromIterable),
    Stream.runCollect
  )
```

## 5. Performance & Concurrency

### Parallel System Execution with Fiber Concurrency

Run independent validation systems concurrently when they don't need to see each other's mutations:

```typescript
import { Effect, Chunk } from "effect"

const runSystemsParallel = (
  systems: Array<System>
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function* () {
    const state = yield* GameState

    const results = yield* Effect.all(
      systems.map((system) => system(state, Chunk.empty())),
      {
        concurrency: "unbounded",
        batching: false
      }
    )

    return Chunk.flatten(results)
  })

const parallelValidation = runSystemsParallel([
  encumbranceSystem,
  cooldownSystem,
  rangeSystem,
  permissionSystem
])
const sequentialValidation = (
  systems: Array<System>
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function* () {
    const state = yield* GameState

    return yield* Effect.reduce(
      systems,
      Chunk.empty<Mutation>(),
      (pendingMutations, system) =>
        Effect.gen(function* () {
          const newMutations = yield* system(state, pendingMutations)
          return Chunk.appendAll(pendingMutations, newMutations)
        })
    )
  })

const hybridValidation = Effect.gen(function* () {
  const state = yield* GameState

  const phase1Mutations = yield* runSystemsParallel([
    encumbranceSystem,
    cooldownSystem
  ])

  const phase2Mutations = yield* Effect.reduce(
    [inventoryRebalanceSystem, statusEffectSystem],
    phase1Mutations,
    (pendingMutations, system) =>
      Effect.gen(function* () {
        const newMutations = yield* system(state, pendingMutations)
        return Chunk.appendAll(pendingMutations, newMutations)
      })
  )

  return phase2Mutations
})
```

### Referentially Transparent Concurrency

Effect fibers guarantee **referential transparency** even with concurrent operations:

```typescript
import { Ref, Effect } from "effect"

const concurrentUpdates = Effect.gen(function* () {
  const counter = yield* Ref.make(0)
  const increment = Ref.updateAndGet(counter, (n) => n + 1)

  const results = yield* Effect.all(
    Array.from({ length: 100 }, () => increment),
    { concurrency: "unbounded" }
  )

  const final = yield* Ref.get(counter)
})
```

### Batched Mutation Application

For high-throughput games, batch mutations and apply in chunks:

```typescript
import { Queue, Effect, Chunk, Schedule } from "effect"

const makeMutationQueue = Effect.gen(function* () {
  const queue = yield* Queue.unbounded<Mutation>()
  const state = yield* GameState
  const committer = yield* Committer

  const processor = Queue.takeBetween(queue, 1, 1000).pipe(
    Effect.flatMap((batch) =>
      Effect.gen(function* () {
        const validated = yield* runSystemsConcurrent(
          batch.map((m) => validateMutation(m))
        )

        yield* committer.commit(validated)
      })
    ),
    Effect.repeat(Schedule.spaced("16 millis")),
    Effect.fork
  )

  yield* processor

  return {
    enqueue: (m: Mutation) => Queue.offer(queue, m)
  }
})
```

## Architecture Summary

```
Intent (player action)
  ↓
Validation Pipeline
  → Systems receive (state, pendingMutations)
  → Parallel: Effect.all (independent systems)
  → Sequential: Effect.reduce (thread mutation buffer)
  → Systems inspect pendingMutations to avoid conflicts
  → Systems return Chunk<Mutation>
  → Effect.validateAll accumulates all errors
  ↓
Mutation Buffer Accumulated
  → Chunk<Mutation> from all systems
  → Fix-up mutations prepended (Chunk.prepend)
  ↓
Committer
  → Effect.acquireUseRelease for transaction
  → Write event log entry
  → Apply mutations to read model atomically
  → Rollback if event log write fails
  ↓
Read Model Updated
  → SynchronizedRef<Map<EntityId, Entity>>
  → Next validation sees new state
```

## Key Patterns

1. **System Signature**: `(state, pendingMutations) => Effect<Mutations, Errors>`

2. **Effect.reduce**: Thread mutation buffer through sequential systems

3. **Effect.all**: Run independent systems in parallel

4. **Effect.validateAll**: Accumulate all validation errors

5. **Effect.acquireUseRelease**: Transactional commits

6. **Type Safety**: Branded UUIDs, one mutation class per component, exact literal component tags

7. **Injectable Services**: All side effects are services with test layers

## Type Safety Guarantees

### IDs

All IDs use `Schema.UUID` with branded types:
- `EntityId`, `TemplateId`, `EventLogEntryId` - UUID validation
- `SystemName` - `Schema.NonEmptyString`

### Mutations

Each mutation class has exact types:
- `SetPositionMutation` - data is `Partial<PositionComponent>`
- `SetHealthMutation` - data is `Partial<HealthComponent>`
- `SetInventoryMutation` - data is `Partial<InventoryComponent>`
- `RemoveComponentMutation` - componentTag is `Literal("Position" | "Health" | "Inventory")`

### Component Tags

`ComponentTag = Schema.Literal("Position", "Health", "Inventory")`

### Numeric Fields

- `Health.current` - `Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))`
- `Health.max` - `Schema.Int.pipe(Schema.greaterThan(0))`
- `Inventory.capacity` - `Schema.Int.pipe(Schema.greaterThan(0))`
- `Inventory.weight` - `Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))`

## Injectable Architecture for Testing

### EventLog Service
- Production: PostgreSQL/SQL persistence
- Test: In-memory `SynchronizedRef<Map<EventLogEntryId, EventLogEntry>>`

### ReadModelStore Service
- Production: PostgreSQL materialized view or Redis cache
- Test: In-memory `SynchronizedRef<Map<EntityId, Entity>>`

### GameState Service
- Depends on ReadModelStore
- Injectable via Layer composition

### Committer Service
- Depends on EventLog + ReadModelStore
- Transactional: event log write → read model update

## Property-Based Testing Setup

```typescript
import { Effect, Layer } from "effect"
import * as fc from "fast-check"

const testLayer = Layer.mergeAll(
  EventLog.testLayer,
  ReadModelStore.testLayer,
  GameState.layer,
  Committer.layer
)

fc.assert(
  fc.property(
    fc.array(arbitraryMutation),
    (mutations) => {
      const program = Effect.gen(function* () {
        const committer = yield* Committer
        const eventLog = yield* EventLog

        const entry = yield* committer.commit(Chunk.fromIterable(mutations))
        const retrieved = yield* eventLog.read(entry.id)

        return retrieved.mutations.length === mutations.length
      })

      return Effect.runSync(program.pipe(Effect.provide(testLayer)))
    }
  )
)
```

## Source Code References

- Validation: `.reference/effect/packages/effect/test/Effect/validation.test.ts`
- Transactions: `.reference/effect/packages/experimental/src/EventJournal.ts:246-269`
- State Management: `.reference/effect/packages/effect/test/SynchronizedRef.test.ts`
- Concurrency: `.reference/effect/packages/effect/test/Effect/collecting.test.ts`
- Context: `.reference/effect/packages/effect/test/Effect/environment.test.ts`
