/**
 * Read Model Store - current game state
 */
import { Context, Effect, Layer, Option, SynchronizedRef } from "effect"

import type { Entity } from "../components.js"
import type { EntityId } from "../entities.js"
import { EntityNotFound } from "../errors.js"

export class ReadModelStore extends Context.Tag("@game/ReadModelStore")<
  ReadModelStore,
  {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
    readonly clear: () => Effect.Effect<void>
  }
>() {
  static readonly testLayer = Layer.effect(
    ReadModelStore,
    Effect.gen(function*() {
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
          // eslint-disable-next-line functional/immutable-data
          newMap.set(entity.id, entity)
          return newMap
        })

      const update = (
        id: EntityId,
        f: (entity: Entity) => Effect.Effect<Entity>
      ) =>
        SynchronizedRef.updateEffect(store, (map) =>
          Effect.gen(function*() {
            const entity = Option.fromNullable(map.get(id))
            if (Option.isNone(entity)) {
              return yield* EntityNotFound.make({ id })
            }
            const updated = yield* f(entity.value)
            const newMap = new Map(map)
            // eslint-disable-next-line functional/immutable-data
            newMap.set(id, updated)
            return newMap
          }))

      const clear = () =>
        SynchronizedRef.update(store, () => new Map<EntityId, Entity>())

      return ReadModelStore.of({ get, set, update, clear })
    })
  )
}
