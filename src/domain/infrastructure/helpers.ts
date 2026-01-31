/**
 * Helper functions for mutations to components
 */
import { Effect, HashMap, Option } from "effect"
import { Entity } from "../components.js"
import { Mutation } from "../mutations.js"
import { EntityNotFound } from "../errors.js"

import * as Components from "../components.js"

export function createComponentFromMutation(
  mutation: Mutation,
  store: {
    readonly get: (id: any) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: any,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
  }
): Effect.Effect<Components.Component, never> {
  if (mutation._tag === "SetAttributes") {
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Attributes")
      const base = Option.isSome(existing) && existing.value instanceof Components.AttributesComponent
        ? existing.value
        : Components.AttributesComponent.make({
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            will: 10,
            constitution: 10,
            charisma: 10
          })

      return Components.AttributesComponent.make({
        strength: mutation.data.strength ?? base.strength,
        dexterity: mutation.data.dexterity ?? base.dexterity,
        intelligence: mutation.data.intelligence ?? base.intelligence,
        will: mutation.data.will ?? base.will,
        constitution: mutation.data.constitution ?? base.constitution,
        charisma: mutation.data.charisma ?? base.charisma
      })
    })
  }

  if (mutation._tag === "SetHealth") {
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Health")
      const base = Option.isSome(existing) && existing.value instanceof Components.HealthComponent
        ? existing.value
        : Components.HealthComponent.make({
            current: 10,
            max: 10,
            traumaActive: false,
            traumaEffect: null
          })

      return Components.HealthComponent.make({
        current: mutation.data.current ?? base.current,
        max: mutation.data.max ?? base.max,
        traumaActive: mutation.data.traumaActive ?? base.traumaActive,
        traumaEffect: mutation.data.traumaEffect ?? base.traumaEffect
      })
    })
  }

  if (mutation._tag === "SetClass") {
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Class")
      const base = Option.isSome(existing) && existing.value instanceof Components.ClassComponent
        ? existing.value
        : Components.ClassComponent.make({ class: "Fighter", level: 1 })

      return Components.ClassComponent.make({
        class: mutation.data.class ?? base.class,
        level: mutation.data.level ?? base.level
      })
    })
  }

  if (mutation._tag === "AddItem") {
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Inventory")
      const base = Option.isSome(existing) && existing.value instanceof Components.InventoryComponent
        ? existing.value
        : Components.InventoryComponent.make({
            items: [],
            loadCapacity: 50,
            currentLoad: 0
          })

      return Components.InventoryComponent.make({
        items: [...base.items, mutation.itemId],
        loadCapacity: base.loadCapacity,
        currentLoad: base.currentLoad // Will be updated by encumbrance system
      })
    })
  }

  if (mutation._tag === "RemoveItem") {
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Inventory")
      const base = Option.isSome(existing) && existing.value instanceof Components.InventoryComponent
        ? existing.value
        : Components.InventoryComponent.make({
            items: [],
            loadCapacity: 50,
            currentLoad: 0
          })

      return Components.InventoryComponent.make({
        items: base.items.filter(id => id !== mutation.itemId),
        loadCapacity: base.loadCapacity,
        currentLoad: base.currentLoad // Will be updated by encumbrance system
      })
    })
  }

  if (mutation._tag === "TransferCurrency") {
    // This mutation affects TWO entities, so we need special handling
    // For now, we'll just update the "from" entity's currency
    return Effect.gen(function* () {
      const entity = yield* store.get(mutation.fromEntityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.fromEntityId,
            components: HashMap.empty()
          })
        )
      )
      const existing = HashMap.get(entity.components, "Currency")
      const base = Option.isSome(existing) && existing.value instanceof Components.CurrencyComponent
        ? existing.value
        : Components.CurrencyComponent.make({ copper: 0, silver: 0, gold: 0 })

      return Components.CurrencyComponent.make({
        copper: base.copper - mutation.copper,
        silver: base.silver - mutation.silver,
        gold: base.gold - mutation.gold
      })
    })
  }

  return Effect.dieMessage(`Unreachable: unknown mutation type ${(mutation as any)._tag}`)
}
