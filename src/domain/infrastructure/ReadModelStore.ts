/**
 * Read Model Store - current game state
 */
import { Effect, Context, Layer, SynchronizedRef, Option } from "effect"
import { EntityId } from "../entities.js"
import { EntityNotFound } from "../errors.js"
import { Entity } from "../components.js"

export class ReadModelStore extends Context.Tag("@game/ReadModelStore")<
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
