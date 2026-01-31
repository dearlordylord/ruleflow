/**
 * Items and Encumbrance
 */
import { Schema } from "effect"

import type { EntityId } from "../entities.js"

export const LoadSize = Schema.Literal("Small", "Standard", "Large", "Massive")
export type LoadSize = typeof LoadSize.Type

export class ItemComponent extends Schema.TaggedClass<ItemComponent>()("Item", {
  name: Schema.NonEmptyString,
  loadSize: LoadSize,
  quantity: Schema.Int.pipe(Schema.greaterThan(0)),

  // Some items are stackable
  isStackable: Schema.Boolean,

  // Value in copper pieces
  valueInCopper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {
  get loadValue(): number {
    const base = this.loadSize === "Small" ? 0.5 :
                 this.loadSize === "Large" ? 2 :
                 this.loadSize === "Massive" ? 4 :
                 1 // Standard
    return base * this.quantity
  }
}

export class InventoryComponent extends Schema.TaggedClass<InventoryComponent>()("Inventory", {
  items: Schema.Array(EntityId),
  loadCapacity: Schema.Number.pipe(Schema.greaterThan(0)),
  currentLoad: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

/**
 * Load categories affecting movement
 * Unencumbered: currentLoad <= capacity
 * Encumbered: currentLoad > capacity, speed reduced
 * Heavily Encumbered: currentLoad > capacity * 1.5, speed halved
 * Overloaded: currentLoad > capacity * 2, cannot move
 */
export function getEncumbranceCategory(currentLoad: number, capacity: number): string {
  if (currentLoad > capacity * 2) return "Overloaded"
  if (currentLoad > capacity * 1.5) return "Heavily Encumbered"
  if (currentLoad > capacity) return "Encumbered"
  return "Unencumbered"
}

/**
 * Common items from rulebook
 */
export const COMMON_ITEMS = {
  Rope: { loadSize: "Standard" as LoadSize, valueInCopper: 10 },
  Torch: { loadSize: "Small" as LoadSize, valueInCopper: 1 },
  "Grappling Hook": { loadSize: "Small" as LoadSize, valueInCopper: 25 },
  Backpack: { loadSize: "Standard" as LoadSize, valueInCopper: 20 },
  Bedroll: { loadSize: "Standard" as LoadSize, valueInCopper: 10 },
  Rations: { loadSize: "Small" as LoadSize, valueInCopper: 5 },
  "Healing Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 500 },
  "Lockpick Set": { loadSize: "Small" as LoadSize, valueInCopper: 250 },
  "Disguise Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 250 },
  "Repair Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 500 }
} as const
