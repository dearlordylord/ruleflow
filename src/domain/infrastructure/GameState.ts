/**
 * Game State - applies mutations to read model
 */
import { Effect, Context, Layer } from "effect"
import { EntityId } from "../entities.js"
import { EntityNotFound } from "../errors.js"
import {
  Entity,
  getComponent,
  setComponent,
  removeComponent,
  HealthComponent
} from "../components.js"
import { Mutation } from "../mutations.js"
import { ReadModelStore } from "./ReadModelStore.js"
import { createComponentFromMutation } from "./helpers.js"

export class GameState extends Context.Tag("@game/State")<
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
          switch (mutation._tag) {
            case "RemoveComponent":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(removeComponent(entity, mutation.componentTag))
              )
              break

            case "DealDamage":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function* () {
                  const health = getComponent(entity, "Health")
                  if (!health) {
                    return entity
                  }
                  const newCurrent = Math.max(0, health.current - mutation.amount)
                  const newHealth = HealthComponent.make({
                    current: newCurrent,
                    max: health.max,
                    traumaActive: health.traumaActive,
                    traumaEffect: health.traumaEffect
                  })
                  return setComponent(entity, newHealth)
                })
              )
              break

            case "PerformAttack":
              // No-op - handled by systems
              break

            case "TransferCurrency":
              // No-op - needs separate debit/credit mutations
              break

            case "AddItem":
            case "RemoveItem": {
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(setComponent(entity, component))
              )
              break
            }

            default: {
              // SetAttributes, SetHealth, SetClass
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(setComponent(entity, component))
              )
            }
          }
        })

      return GameState.of({ getEntity, applyMutation })
    })
  )
}
