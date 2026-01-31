/**
 * Encumbrance System
 */
import { Effect, Chunk, HashMap, Option } from "effect"
import type { System } from "./types.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import {
  InventoryComponent,
  ItemComponent
} from "../components.js"

export const encumbranceValidationSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const addItemMutations = Chunk.filter(
      pendingMutations,
      (m) => m._tag === "AddItem"
    )

    for (const mutation of addItemMutations) {
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

      const inventoryOpt = HashMap.get(character.components, "Inventory")
      const itemCompOpt = HashMap.get(item.components, "Item")

      if (Option.isNone(inventoryOpt) || Option.isNone(itemCompOpt)) {
        continue
      }

      const inventory = inventoryOpt.value
      const itemComp = itemCompOpt.value

      if (
        !(inventory instanceof InventoryComponent) ||
        !(itemComp instanceof ItemComponent)
      ) {
        continue
      }

      const newLoad = inventory.currentLoad + itemComp.loadValue

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
    }

    return Chunk.empty()
  })

export const attributeModifierSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    // For now, just return empty - full implementation would recalculate
    // AC, load capacity, etc. based on new attribute modifiers
    return Chunk.empty()
  })
