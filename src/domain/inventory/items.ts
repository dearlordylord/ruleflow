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
}) {}

// Utility function for load value calculation
export function getLoadValue(item: ItemComponent): number {
  const base = item.loadSize === "Small"
    ? 0.5
    : item.loadSize === "Large"
    ? 2
    : item.loadSize === "Massive"
    ? 4
    : 1 // Standard
  return base * item.quantity
}

export const DEFAULT_INVENTORY: {
  readonly items: ReadonlyArray<EntityId>
  readonly loadCapacity: number
  readonly currentLoad: number
} = {
  items: [],
  loadCapacity: 50,
  currentLoad: 0
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

type CommonItemEntry = {
  readonly loadSize: LoadSize
  readonly valueInCopper: number
}

/**
 * Common items from rulebook
 * Prices converted from rulebook: см (silver) × 10 = copper, мм (copper) = 1
 */
export const COMMON_ITEMS = {
  // AMMUNITION
  "Alchemical Fire": { loadSize: "Standard", valueInCopper: 200 }, // 20 см
  "Arrows (10)": { loadSize: "Small", valueInCopper: 50 }, // 5 см
  "Crossbow Bolts (10)": { loadSize: "Small", valueInCopper: 50 }, // 5 см
  "Sling Bullets (10)": { loadSize: "Small", valueInCopper: 20 }, // 2 см
  "Powder and Bullets (10)": { loadSize: "Small", valueInCopper: 50 }, // 5 см

  // CONTAINERS
  Backpack: { loadSize: "Standard", valueInCopper: 10 }, // 1 см
  "Powder Horn": { loadSize: "Small", valueInCopper: 10 }, // 1 см
  Quiver: { loadSize: "Small", valueInCopper: 50 }, // 5 см
  Sack: { loadSize: "Small", valueInCopper: 1 }, // 1 мм
  "Sling Bag": { loadSize: "Small", valueInCopper: 1 }, // 5 мм (treating as negligible)
  "Javelin Case": { loadSize: "Small", valueInCopper: 50 }, // 5 см

  // LIGHT SOURCES
  "Candles (10)": { loadSize: "Small", valueInCopper: 10 }, // 1 см
  Torch: { loadSize: "Small", valueInCopper: 1 }, // 1 мм
  Lantern: { loadSize: "Standard", valueInCopper: 50 }, // 5 см
  "Glowing Rod": { loadSize: "Standard", valueInCopper: 200 }, // 20 см
  "Flint and Steel": { loadSize: "Small", valueInCopper: 1 }, // 2 мм (rounding up)
  "Oil (pint)": { loadSize: "Small", valueInCopper: 1 }, // 5 мм (rounding up)

  // ADVENTURING GEAR
  Rope: { loadSize: "Standard", valueInCopper: 20 }, // 2 см
  "Grappling Hook": { loadSize: "Small", valueInCopper: 20 }, // 2 см
  Bandolier: { loadSize: "Standard", valueInCopper: 100 }, // 10 см
  Garrote: { loadSize: "Small", valueInCopper: 10 }, // 1 см
  "Smoke Grenade": { loadSize: "Small", valueInCopper: 100 }, // 10 см
  "Powder Grenade": { loadSize: "Small", valueInCopper: 100 }, // 10 см
  "Paper (sheet)": { loadSize: "Small", valueInCopper: 1 }, // 1 мм
  "Pen and Ink": { loadSize: "Small", valueInCopper: 10 }, // 1 см
  Rations: { loadSize: "Small", valueInCopper: 1 }, // 5 мм (rounding up)
  Saddle: { loadSize: "Large", valueInCopper: 50 }, // 5 см
  "War Saddle": { loadSize: "Large", valueInCopper: 250 }, // 25 см
  Bedroll: { loadSize: "Standard", valueInCopper: 1 }, // 5 мм (rounding up)
  "Warm Clothing": { loadSize: "Standard", valueInCopper: 250 }, // 25 см
  "Pole (10 ft)": { loadSize: "Large", valueInCopper: 1 }, // 5 мм (rounding up)
  Pavise: { loadSize: "Large", valueInCopper: 200 }, // 20 см (large shield)
  "Gauntlets (plated)": { loadSize: "Small", valueInCopper: 500 }, // 50 см

  // KITS
  "Healing Kit": { loadSize: "Standard", valueInCopper: 100 }, // 10 см
  "Lockpick Set": { loadSize: "Small", valueInCopper: 200 }, // 20 см
  "Disguise Kit": { loadSize: "Standard", valueInCopper: 100 }, // 10 см
  "Repair Kit": { loadSize: "Standard", valueInCopper: 100 }, // 10 см

  // POISONS
  "White Arsenic": { loadSize: "Small", valueInCopper: 500 }, // 50 см
  "Wolfsbane Death": { loadSize: "Small", valueInCopper: 2000 }, // 200 см
  Cantarella: { loadSize: "Small", valueInCopper: 1000 }, // 100 см
  "Salt of the Hanged": { loadSize: "Small", valueInCopper: 1500 } // 150 см
} as const satisfies Record<string, CommonItemEntry>
