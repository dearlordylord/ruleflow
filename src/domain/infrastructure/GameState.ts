/**
 * Game State - applies mutations to read model
 */
import { Context, Effect, Layer } from "effect"

import type { Entity } from "../components.js"
import { CurrencyComponent, getComponent, HealthComponent, removeComponent, setComponent } from "../components.js"
import { CharacterCreationComponent } from "../character/index.js"
import type { EntityId } from "../entities.js"
import type { EntityNotFound } from "../errors.js"
import type { Mutation } from "../mutations.js"
import { createComponentFromMutation } from "./helpers.js"
import { ReadModelStore } from "./ReadModelStore.js"

export class GameState extends Context.Tag("@game/State")<
  GameState,
  {
    readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly applyMutation: (mutation: Mutation) => Effect.Effect<void, EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    GameState,
    Effect.gen(function*() {
      const store = yield* ReadModelStore

      const getEntity = (id: EntityId) => store.get(id)

      const applyMutation = (mutation: Mutation) =>
        Effect.gen(function*() {
          switch (mutation._tag) {
            case "RemoveComponent":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(removeComponent(entity, mutation.componentTag)))
              break

            case "SetMultipleComponents":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  let updated = entity

                  // Remove components first
                  for (const tag of mutation.removeComponents) {
                    updated = removeComponent(updated, tag)
                  }

                  // Set all components
                  for (const component of mutation.components) {
                    updated = setComponent(updated, component)
                  }

                  return updated
                }))
              break

            case "DealDamage":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
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
                }))
              break

            case "DebitCurrency":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const currency = getComponent(entity, "Currency")
                  if (!currency) {
                    return entity
                  }
                  const newCurrency = CurrencyComponent.make({
                    copper: currency.copper - mutation.copper,
                    silver: currency.silver - mutation.silver,
                    gold: currency.gold - mutation.gold
                  })
                  return setComponent(entity, newCurrency)
                }))
              break

            case "CreditCurrency":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const currency = getComponent(entity, "Currency")
                  if (!currency) {
                    return entity
                  }
                  const newCurrency = CurrencyComponent.make({
                    copper: currency.copper + mutation.copper,
                    silver: currency.silver + mutation.silver,
                    gold: currency.gold + mutation.gold
                  })
                  return setComponent(entity, newCurrency)
                }))
              break

            case "UpdateCharacterCreation":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const existing = getComponent(entity, "CharacterCreation")
                  if (!existing) {
                    return entity
                  }
                  const updated = CharacterCreationComponent.make({
                    playerId: mutation.data.playerId ?? existing.playerId,
                    currentStep: mutation.data.currentStep ?? existing.currentStep,
                    startingLevel: mutation.data.startingLevel ?? existing.startingLevel,
                    attributes: mutation.data.attributes !== undefined ? mutation.data.attributes : existing.attributes,
                    class: mutation.data.class !== undefined ? mutation.data.class : existing.class,
                    skills: mutation.data.skills !== undefined ? mutation.data.skills : existing.skills,
                    trait: mutation.data.trait !== undefined ? mutation.data.trait : existing.trait,
                    hitPoints: mutation.data.hitPoints !== undefined ? mutation.data.hitPoints : existing.hitPoints,
                    startingMoney: mutation.data.startingMoney ?? existing.startingMoney,
                    remainingMoney: mutation.data.remainingMoney ?? existing.remainingMoney,
                    purchasedItems: mutation.data.purchasedItems ?? existing.purchasedItems,
                    languages: mutation.data.languages ?? existing.languages,
                    alignment: mutation.data.alignment !== undefined ? mutation.data.alignment : existing.alignment,
                    name: mutation.data.name !== undefined ? mutation.data.name : existing.name,
                    mysteries: mutation.data.mysteries !== undefined ? mutation.data.mysteries : existing.mysteries
                  })
                  return setComponent(entity, updated)
                }))
              break

            case "AddItem":
            case "RemoveItem": {
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(setComponent(entity, component)))
              break
            }

            case "DamageEquipment":
            case "ReloadWeapon":
              // These mutations operate on equipment entities directly
              // They should be handled by their own systems, not in GameState default case
              // For now, skip them to avoid type errors
              break

            default: {
              // SetAttributes, SetHealth, SetClass
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) => Effect.succeed(setComponent(entity, component)))
            }
          }
        })

      return GameState.of({ getEntity, applyMutation })
    })
  )
}
