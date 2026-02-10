/**
 * Dashboard ReadModelStore - wraps ReadModelStore + adds getAll()
 */
import { Context, Effect, Layer, Option, SynchronizedRef } from "effect"

import type { EntityId } from "../../domain/entities.js"
import type { Entity } from "../../domain/entity.js"
import { EntityNotFound } from "../../domain/errors.js"
import { ReadModelStore } from "../../domain/infrastructure/ReadModelStore.js"

export class DashboardReadModelStore extends Context.Tag("@dashboard/ReadModelStore")<
  DashboardReadModelStore,
  {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
    readonly clear: () => Effect.Effect<void>
    readonly getAll: () => Effect.Effect<ReadonlyMap<EntityId, Entity>>
  }
>() {
  static readonly layer = Layer.effect(
    DashboardReadModelStore,
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
            newMap.set(id, updated)
            return newMap
          }))

      const clear = () => SynchronizedRef.update(store, () => new Map<EntityId, Entity>())

      const getAll = () => SynchronizedRef.get(store) as Effect.Effect<ReadonlyMap<EntityId, Entity>>

      return DashboardReadModelStore.of({ get, set, update, clear, getAll })
    })
  )

  /** Bridge layer: provides ReadModelStore from DashboardReadModelStore */
  static readonly toReadModelStore = Layer.effect(
    ReadModelStore,
    Effect.gen(function*() {
      const dashboard = yield* DashboardReadModelStore
      return ReadModelStore.of({
        get: dashboard.get,
        set: dashboard.set,
        update: dashboard.update,
        clear: dashboard.clear
      })
    })
  )
}
