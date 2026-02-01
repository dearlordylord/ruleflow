/**
 * Helper functions for mutations to components
 */
import { Effect } from "effect"

import {
  AttributesComponent,
  ClassComponent,
  HealthComponent,
  SavingThrowsComponent,
  SkillsComponent
} from "../character/index.js"
import type { EntityId } from "../entities.js"
import type { Component, Entity, getComponent } from "../entity.js"
import type { EntityNotFound } from "../errors.js"
import { InventoryComponent } from "../inventory/items.js"
import type { Mutation } from "../mutations.js"

/**
 * Get existing component from store, handling entity not found
 */
function getExistingComponent<T extends Component["_tag"]>(
  store: {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
  },
  entityId: EntityId,
  componentTag: T
): Effect.Effect<Extract<Component, { _tag: T }> | null, never> {
  return store.get(entityId).pipe(
    Effect.map(entity => {
      const component = getComponent(entity, componentTag)
      return component as Extract<Component, { _tag: T }> | null
    }),
    Effect.orElseSucceed(() => null)
  )
}

export function createComponentFromMutation(
  mutation: Mutation,
  store: {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
    readonly clear: () => Effect.Effect<void>
  }
): Effect.Effect<Component, never> {
  if (mutation._tag === "SetAttributes") {
    return getExistingComponent(store, mutation.entityId, "Attributes").pipe(
      Effect.map(existing => AttributesComponent.applyMutation(existing, mutation))
    )
  }

  if (mutation._tag === "SetHealth") {
    return getExistingComponent(store, mutation.entityId, "Health").pipe(
      Effect.map(existing => HealthComponent.applyMutation(existing, mutation))
    )
  }

  if (mutation._tag === "SetClass") {
    return getExistingComponent(store, mutation.entityId, "Class").pipe(
      Effect.map(existing => ClassComponent.applyMutation(existing, mutation))
    )
  }

  if (mutation._tag === "SetSkills") {
    return getExistingComponent(store, mutation.entityId, "Skills").pipe(
      Effect.map(existing => SkillsComponent.applyMutation(existing, mutation))
    )
  }

  if (mutation._tag === "SetSavingThrows") {
    return getExistingComponent(store, mutation.entityId, "SavingThrows").pipe(
      Effect.map(existing => SavingThrowsComponent.applyMutation(existing, mutation))
    )
  }

  if (mutation._tag === "AddItem") {
    return getExistingComponent(store, mutation.entityId, "Inventory").pipe(
      Effect.map(existing => InventoryComponent.applyAddItem(existing, mutation))
    )
  }

  if (mutation._tag === "RemoveItem") {
    return getExistingComponent(store, mutation.entityId, "Inventory").pipe(
      Effect.map(existing => InventoryComponent.applyRemoveItem(existing, mutation))
    )
  }

  if (mutation._tag === "DebitCurrency" || mutation._tag === "CreditCurrency") {
    // These mutations are handled directly in GameState.applyMutation
    return Effect.die(`DebitCurrency/CreditCurrency should not reach createComponentFromMutation`)
  }

  if (
    mutation._tag === "DealDamage"
    || mutation._tag === "RemoveComponent"
    || mutation._tag === "SetMultipleComponents"
    || mutation._tag === "UpdateCharacterCreation"
  ) {
    // These mutations are handled directly in GameState.applyMutation
    return Effect.die(`${mutation._tag} should not reach createComponentFromMutation`)
  }

  // Should never reach here - only called for mutations that create components
  return Effect.die(`Unexpected mutation type in createComponentFromMutation`)
}
