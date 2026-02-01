/**
 * Encumbrance System
 */
import { Chunk, Effect } from "effect"

import { SystemName } from "../entities.js"
import { getComponent } from "../entity.js"
import { DomainError } from "../errors.js"
import { getLoadValue } from "../inventory/items.js"
import type { System } from "./types.js"

export const encumbranceValidationSystem: System = (state, _events, accumulatedMutations) =>
  Effect.gen(function*() {
    const addItemMutations = Chunk.filter(
      accumulatedMutations,
      (m) => m._tag === "AddItem"
    )

    yield* Effect.forEach(addItemMutations, (mutation) =>
      Effect.gen(function*() {
        const character = yield* state.getEntity(mutation.entityId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("Encumbrance"),
                message: `Character ${mutation.entityId} not found`
              })
            )
          )
        )

        const item = yield* state.getEntity(mutation.itemId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("Encumbrance"),
                message: `Item ${mutation.itemId} not found`
              })
            )
          )
        )

        const inventory = getComponent(character, "Inventory")
        const itemComp = getComponent(item, "Item")

        if (!inventory || !itemComp) {
          return
        }

        const newLoad = inventory.currentLoad + getLoadValue(itemComp)

        if (newLoad > inventory.loadCapacity) {
          return yield* Effect.fail(
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("Encumbrance"),
                message: `Adding item exceeds capacity: ${newLoad} > ${inventory.loadCapacity}`
              })
            )
          )
        }
      }))

    return Chunk.empty()
  })

export const attributeModifierSystem: System = (_state, _events, _accumulatedMutations) =>
  Effect.gen(function*() {
    // For now, just return empty - full implementation would recalculate
    // AC, load capacity, etc. based on new attribute modifiers
    return Chunk.empty()
  })
