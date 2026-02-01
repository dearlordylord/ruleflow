/**
 * Items and Encumbrance
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

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
    const base = this.loadSize === "Small"
      ? 0.5
      : this.loadSize === "Large"
      ? 2
      : this.loadSize === "Massive"
      ? 4
      : 1 // Standard
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
 * Prices converted from rulebook: см (silver) × 10 = copper, мм (copper) = 1
 */
export const COMMON_ITEMS = {
  // AMMUNITION
  "Alchemical Fire": { loadSize: "Standard" as LoadSize, valueInCopper: 200 }, // 20 см
  "Arrows (10)": { loadSize: "Small" as LoadSize, valueInCopper: 50 }, // 5 см
  "Crossbow Bolts (10)": { loadSize: "Small" as LoadSize, valueInCopper: 50 }, // 5 см
  "Sling Bullets (10)": { loadSize: "Small" as LoadSize, valueInCopper: 20 }, // 2 см
  "Powder and Bullets (10)": { loadSize: "Small" as LoadSize, valueInCopper: 50 }, // 5 см

  // CONTAINERS
  Backpack: { loadSize: "Standard" as LoadSize, valueInCopper: 10 }, // 1 см
  "Powder Horn": { loadSize: "Small" as LoadSize, valueInCopper: 10 }, // 1 см
  Quiver: { loadSize: "Small" as LoadSize, valueInCopper: 50 }, // 5 см
  Sack: { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 1 мм
  "Sling Bag": { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 5 мм (treating as negligible)
  "Javelin Case": { loadSize: "Small" as LoadSize, valueInCopper: 50 }, // 5 см

  // LIGHT SOURCES
  "Candles (10)": { loadSize: "Small" as LoadSize, valueInCopper: 10 }, // 1 см
  Torch: { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 1 мм
  Lantern: { loadSize: "Standard" as LoadSize, valueInCopper: 50 }, // 5 см
  "Glowing Rod": { loadSize: "Standard" as LoadSize, valueInCopper: 200 }, // 20 см
  "Flint and Steel": { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 2 мм (rounding up)
  "Oil (pint)": { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 5 мм (rounding up)

  // ADVENTURING GEAR
  Rope: { loadSize: "Standard" as LoadSize, valueInCopper: 20 }, // 2 см
  "Grappling Hook": { loadSize: "Small" as LoadSize, valueInCopper: 20 }, // 2 см
  Bandolier: { loadSize: "Standard" as LoadSize, valueInCopper: 100 }, // 10 см
  Garrote: { loadSize: "Small" as LoadSize, valueInCopper: 10 }, // 1 см
  "Smoke Grenade": { loadSize: "Small" as LoadSize, valueInCopper: 100 }, // 10 см
  "Powder Grenade": { loadSize: "Small" as LoadSize, valueInCopper: 100 }, // 10 см
  "Paper (sheet)": { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 1 мм
  "Pen and Ink": { loadSize: "Small" as LoadSize, valueInCopper: 10 }, // 1 см
  Rations: { loadSize: "Small" as LoadSize, valueInCopper: 1 }, // 5 мм (rounding up)
  Saddle: { loadSize: "Large" as LoadSize, valueInCopper: 50 }, // 5 см
  "War Saddle": { loadSize: "Large" as LoadSize, valueInCopper: 250 }, // 25 см
  Bedroll: { loadSize: "Standard" as LoadSize, valueInCopper: 1 }, // 5 мм (rounding up)
  "Warm Clothing": { loadSize: "Standard" as LoadSize, valueInCopper: 250 }, // 25 см
  "Pole (10 ft)": { loadSize: "Large" as LoadSize, valueInCopper: 1 }, // 5 мм (rounding up)
  Pavise: { loadSize: "Large" as LoadSize, valueInCopper: 200 }, // 20 см (large shield)
  "Gauntlets (plated)": { loadSize: "Small" as LoadSize, valueInCopper: 500 }, // 50 см

  // KITS
  "Healing Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 100 }, // 10 см
  "Lockpick Set": { loadSize: "Small" as LoadSize, valueInCopper: 200 }, // 20 см
  "Disguise Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 100 }, // 10 см
  "Repair Kit": { loadSize: "Standard" as LoadSize, valueInCopper: 100 }, // 10 см

  // POISONS
  "White Arsenic": { loadSize: "Small" as LoadSize, valueInCopper: 500 }, // 50 см
  "Wolfsbane Death": { loadSize: "Small" as LoadSize, valueInCopper: 2000 }, // 200 см
  Cantarella: { loadSize: "Small" as LoadSize, valueInCopper: 1000 }, // 100 см
  "Salt of the Hanged": { loadSize: "Small" as LoadSize, valueInCopper: 1500 } // 150 см
} as const
