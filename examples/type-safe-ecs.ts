/**
 * Type-Safe Event-Sourced ECS Architecture
 */

import {
  Effect,
  Schema,
  Context,
  Layer,
  HashMap,
  Option,
  Chunk,
  SynchronizedRef,
  Exit
} from "effect"

// ============================================================================
// Branded IDs
// ============================================================================

const EntityId = Schema.UUID.pipe(Schema.brand("EntityId"))
type EntityId = typeof EntityId.Type

const EventLogEntryId = Schema.UUID.pipe(Schema.brand("EventLogEntryId"))
type EventLogEntryId = typeof EventLogEntryId.Type

const SystemName = Schema.NonEmptyString.pipe(Schema.brand("SystemName"))
type SystemName = typeof SystemName.Type

// ============================================================================
// Components
// ============================================================================

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

// ============================================================================
// Entity
// ============================================================================

class Entity extends Schema.Class<Entity>("Entity")({
  id: EntityId,
  components: Schema.HashMap({ key: ComponentTag, value: Component })
}) {}

// ============================================================================
// Mutations
// ============================================================================
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

// ============================================================================
// Errors
// ============================================================================

class EntityNotFound extends Schema.TaggedError<EntityNotFound>()(
  "EntityNotFound",
  { id: EntityId }
) {}

class DomainError extends Schema.TaggedError<DomainError>()(
  "DomainError",
  {
    systemName: SystemName,
    message: Schema.NonEmptyString
  }
) {}

class EventLogWriteError extends Schema.TaggedError<EventLogWriteError>()(
  "EventLogWriteError",
  {
    entryId: EventLogEntryId,
    error: Schema.Defect
  }
) {}

class EventLogEntryNotFound extends Schema.TaggedError<EventLogEntryNotFound>()(
  "EventLogEntryNotFound",
  { id: EventLogEntryId }
) {}

// ============================================================================
// Event Log Entry
// ============================================================================

class EventLogEntry extends Schema.Class<EventLogEntry>("EventLogEntry")({
  id: EventLogEntryId,
  timestamp: Schema.Date,
  mutations: Schema.Array(Mutation)
}) {}

// ============================================================================
// Injectable Services
// ============================================================================
class EventLog extends Context.Tag("@game/EventLog")<
  EventLog,
  {
    readonly append: (
      entry: EventLogEntry
    ) => Effect.Effect<void, EventLogWriteError>
    readonly read: (
      id: EventLogEntryId
    ) => Effect.Effect<EventLogEntry, EventLogEntryNotFound>
  }
>() {
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
              onNone: () => Effect.fail(EventLogEntryNotFound.make({ id })),
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
              onNone: () => Effect.fail(EntityNotFound.make({ id })),
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

      const update = (
        id: EntityId,
        f: (entity: Entity) => Effect.Effect<Entity>
      ) =>
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

class GameState extends Context.Tag("@game/State")<
  GameState,
  {
    readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly applyMutation: (mutation: Mutation) => Effect.Effect<void, EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    GameState,
    Effect.gen(function* () {
      const store = yield* ReadModelStore

      const getEntity = (id: EntityId) =>
        store.get(id)

      const applyMutation = (mutation: Mutation) =>
        Effect.gen(function* () {
          if (mutation._tag === "RemoveComponent") {
            yield* store.update(mutation.entityId, (entity) =>
              Effect.succeed(
                Entity.make({
                  ...entity,
                  components: HashMap.remove(
                    entity.components,
                    mutation.componentTag
                  )
                })
              )
            )
          } else {
            const component = yield* createComponentFromMutation(mutation)
            yield* store.update(mutation.entityId, (entity) =>
              Effect.succeed(
                Entity.make({
                  ...entity,
                  components: HashMap.set(
                    entity.components,
                    getComponentTag(component),
                    component
                  )
                })
              )
            )
          }
        })

      return GameState.of({ getEntity, applyMutation })
    })
  )
}

class Committer extends Context.Tag("@game/Committer")<
  Committer,
  {
    readonly commit: (
      mutations: Chunk.Chunk<Mutation>
    ) => Effect.Effect<EventLogEntry, EventLogWriteError | EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    Committer,
    Effect.gen(function* () {
      const eventLog = yield* EventLog
      const state = yield* GameState

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
                Effect.forEach(mutations, (m) => state.applyMutation(m))
              ),
              Effect.as(entry)
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

// ============================================================================
// System Type & Pipeline
// ============================================================================

interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

type System = (
  state: ReadonlyGameState,
  pendingMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>>

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
const healthValidationSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const playerId = EntityId.make("550e8400-e29b-41d4-a716-446655440000")

    const hasHealthMutation = Chunk.some(
      pendingMutations,
      (m) => m._tag === "SetHealth" && m.entityId === playerId
    )

    if (hasHealthMutation) {
      return Chunk.empty()
    }

    const player = yield* state.getEntity(playerId).pipe(
      Effect.orElseFail(() =>
        Chunk.of(
          DomainError.make({
            systemName: SystemName.make("HealthValidation"),
            message: "Player not found"
          })
        )
      )
    )

    const health = HashMap.get(player.components, "Health")
    if (Option.isSome(health)) {
      const healthComp = health.value
      if (
        healthComp instanceof HealthComponent &&
        healthComp.current < 20
      ) {
        return Chunk.of(
          SetHealthMutation.make({
            entityId: playerId,
            data: { current: 20 }
          })
        )
      }
    }

    return Chunk.empty()
  })

// ============================================================================
// Helper Functions
// ============================================================================

function getComponentTag(component: Component): ComponentTag {
  if (component instanceof PositionComponent) {
    return "Position"
  }
  if (component instanceof HealthComponent) {
    return "Health"
  }
  if (component instanceof InventoryComponent) {
    return "Inventory"
  }
  throw new Error("Unknown component type")
}

function createComponentFromMutation(
  mutation: Mutation
): Effect.Effect<Component, never> {
  if (mutation._tag === "SetPosition") {
    return Effect.succeed(
      PositionComponent.make({
        x: mutation.data.x ?? 0,
        y: mutation.data.y ?? 0,
        z: mutation.data.z ?? 0
      })
    )
  }
  if (mutation._tag === "SetHealth") {
    return Effect.succeed(
      HealthComponent.make({
        current: mutation.data.current ?? 100,
        max: mutation.data.max ?? 100
      })
    )
  }
  if (mutation._tag === "SetInventory") {
    return Effect.succeed(
      InventoryComponent.make({
        items: mutation.data.items ?? [],
        capacity: mutation.data.capacity ?? 10,
        weight: mutation.data.weight ?? 0
      })
    )
  }
  return Effect.dieMessage("Unreachable: unknown mutation type")
}

// ============================================================================
// Example Usage
// ============================================================================

const baseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  EventLog.testLayer
)

const gameStateLayer = GameState.layer.pipe(
  Layer.provide(baseLayer)
)

const committerLayer = Committer.layer.pipe(
  Layer.provide(Layer.merge(baseLayer, gameStateLayer))
)

const testLayer = Layer.mergeAll(
  baseLayer,
  gameStateLayer,
  committerLayer
)

const program = Effect.gen(function* () {
  const committer = yield* Committer
  const state = yield* GameState

  const playerId = EntityId.make("550e8400-e29b-41d4-a716-446655440000")
  const store = yield* ReadModelStore
  yield* store.set(
    Entity.make({
      id: playerId,
      components: HashMap.make(
        ["Health", HealthComponent.make({ current: 10, max: 100 })] as [ComponentTag, Component]
      )
    })
  )

  const positionSystem: System = (state, pendingMutations) =>
    Effect.succeed(
      Chunk.of(
        SetPositionMutation.make({
          entityId: playerId,
          data: { x: 10, y: 20, z: 0 }
        })
      )
    )

  const systems = [healthValidationSystem, positionSystem]
  const mutations = yield* runSystemsPipeline(systems)

  yield* Effect.logInfo(`Pipeline produced ${mutations.length} mutations`)
  yield* Effect.logInfo(`State still shows health: 10`)

  const beforeCommit = yield* state.getEntity(playerId)
  const healthBefore = HashMap.get(beforeCommit.components, "Health")
  yield* Effect.logInfo(
    `Before commit: ${
      Option.isSome(healthBefore) && healthBefore.value instanceof HealthComponent
        ? healthBefore.value.current
        : "N/A"
    }`
  )

  const entry = yield* committer.commit(mutations)
  yield* Effect.logInfo(`Committed ${entry.id}`)

  const afterCommit = yield* state.getEntity(playerId)
  const healthAfter = HashMap.get(afterCommit.components, "Health")
  const positionAfter = HashMap.get(afterCommit.components, "Position")
  yield* Effect.logInfo(
    `After commit - Health: ${
      Option.isSome(healthAfter) && healthAfter.value instanceof HealthComponent
        ? healthAfter.value.current
        : "N/A"
    }`
  )
  yield* Effect.logInfo(
    `After commit - Position: ${
      Option.isSome(positionAfter) && positionAfter.value instanceof PositionComponent
        ? `(${positionAfter.value.x}, ${positionAfter.value.y})`
        : "N/A"
    }`
  )
})

Effect.runPromise(program.pipe(Effect.provide(testLayer)))
