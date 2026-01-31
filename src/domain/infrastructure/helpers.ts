/**
 * Helper functions for mutations to components
 */
import { Effect } from "effect"

import { Entity, getComponent } from "../components.js"
import * as Components from "../components.js"
import type { EntityId } from "../entities.js"
import type { EntityNotFound } from "../errors.js"
import type { Mutation } from "../mutations.js"

export function createComponentFromMutation(
  mutation: Mutation,
  store: {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
  }
): Effect.Effect<Components.Component, never> {
  if (mutation._tag === "SetAttributes") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Attributes")
      const base = existing instanceof Components.AttributesComponent
        ? existing
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
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Health")
      const base = existing instanceof Components.HealthComponent
        ? existing
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
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Class")
      const base = existing instanceof Components.ClassComponent
        ? existing
        : Components.ClassComponent.make({ class: "Fighter", level: 1 })

      return Components.ClassComponent.make({
        class: mutation.data.class ?? base.class,
        level: mutation.data.level ?? base.level
      })
    })
  }

  if (mutation._tag === "AddItem") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Inventory")
      const base = existing instanceof Components.InventoryComponent
        ? existing
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
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Inventory")
      const base = existing instanceof Components.InventoryComponent
        ? existing
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
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.fromEntityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.fromEntityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Currency")
      const base = existing instanceof Components.CurrencyComponent
        ? existing
        : Components.CurrencyComponent.make({ copper: 0, silver: 0, gold: 0 })

      return Components.CurrencyComponent.make({
        copper: base.copper - mutation.copper,
        silver: base.silver - mutation.silver,
        gold: base.gold - mutation.gold
      })
    })
  }

  // Should never reach here - only called for mutations that create components
  return Effect.die(`Unexpected mutation type in createComponentFromMutation`)
}
