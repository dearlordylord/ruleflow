/**
 * Game State - applies mutations to read model
 */
import { Effect, Context, Layer, HashMap, Option } from "effect"
import { EntityId } from "../entities.js"
import { EntityNotFound } from "../errors.js"
import { Entity, getComponentTag, HealthComponent } from "../components.js"
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
          } else if (mutation._tag === "DealDamage") {
            // Special handling: subtract damage from current HP
            yield* store.update(mutation.entityId, (entity) =>
              Effect.gen(function* () {
                const healthOpt = HashMap.get(entity.components, "Health")
                if (Option.isNone(healthOpt)) {
                  return entity
                }
                const health = healthOpt.value
                if (!(health instanceof HealthComponent)) {
                  return entity
                }
                const newCurrent = Math.max(0, health.current - mutation.amount)
                const newHealth = HealthComponent.make({
                  current: newCurrent,
                  max: health.max,
                  traumaActive: health.traumaActive,
                  traumaEffect: health.traumaEffect
                })
                return Entity.make({
                  ...entity,
                  components: HashMap.set(entity.components, "Health", newHealth)
                })
              })
            )
          } else if (mutation._tag === "PerformAttack") {
            // PerformAttack doesn't modify state directly - combat system handles it
            // No-op
          } else if (mutation._tag === "TransferCurrency") {
            // TransferCurrency affects two entities - handle specially
            // For now, no-op (would need separate mutations for debit/credit)
          } else if (mutation._tag === "AddItem" || mutation._tag === "RemoveItem") {
            const component = yield* createComponentFromMutation(mutation, store)
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
          } else {
            // SetAttributes, SetHealth, SetClass
            const component = yield* createComponentFromMutation(mutation, store)
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
