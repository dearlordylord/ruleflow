/**
 * Armor and Protection
 */
import { Schema } from "effect"

/**
 * Armor weight categories
 */
export const ArmorCategory = Schema.Literal("None", "Light", "Medium", "Heavy")
export type ArmorCategory = typeof ArmorCategory.Type

export class ArmorComponent extends Schema.TaggedClass<ArmorComponent>()("Armor", {
  name: Schema.NonEmptyString,
  baseAC: Schema.Int.pipe(Schema.greaterThanOrEqualTo(10)),
  armorCategory: ArmorCategory,

  // Movement/stealth penalties
  movementPenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  stealthPenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Durability
  durability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  maxDurability: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

/**
 * Shield component (separate from armor)
 */
export class ShieldComponent extends Schema.TaggedClass<ShieldComponent>()("Shield", {
  name: Schema.NonEmptyString,
  acBonus: Schema.Int.pipe(Schema.greaterThan(0)), // Usually +1

  // Can be used for bashing
  bashDamage: Schema.NullOr(Schema.String), // e.g., "1d4"

  // Durability (shields can break from critical hits)
  durability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  maxDurability: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

/**
 * Predefined armor types from rulebook
 */
export const ARMOR_DEFINITIONS = {
  "No Protection": {
    baseAC: 11,
    armorCategory: "None" as ArmorCategory,
    movementPenalty: 0,
    stealthPenalty: 0
  },
  "Leather Clothing": {
    baseAC: 12,
    armorCategory: "Light" as ArmorCategory,
    movementPenalty: 0,
    stealthPenalty: 0
  },
  "Quilted Clothing": {
    baseAC: 13,
    armorCategory: "Light" as ArmorCategory,
    movementPenalty: 0,
    stealthPenalty: 0
  },
  "Scale Armor": {
    baseAC: 14,
    armorCategory: "Medium" as ArmorCategory,
    movementPenalty: 5,
    stealthPenalty: 2
  },
  "Chain Mail": {
    baseAC: 15,
    armorCategory: "Medium" as ArmorCategory,
    movementPenalty: 5,
    stealthPenalty: 2
  },
  "Plate Armor": {
    baseAC: 16,
    armorCategory: "Heavy" as ArmorCategory,
    movementPenalty: 10,
    stealthPenalty: 4
  },
  "Full Plate": {
    baseAC: 17,
    armorCategory: "Heavy" as ArmorCategory,
    movementPenalty: 10,
    stealthPenalty: 4
  }
} as const

/**
 * Cover bonuses from environment
 */
export const CoverBonus = {
  None: 0,
  Quarter: 1, // 25%
  Half: 2, // 50%
  ThreeQuarters: 3, // 75%
  Nine0Percent: 4, // 90%
  Full: 999 // Cannot be targeted
} as const
