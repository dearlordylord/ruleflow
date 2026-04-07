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

  // Skill penalty from rulebook "Штраф" column (0 or negative)
  skillPenalty: Schema.Int.pipe(Schema.lessThanOrEqualTo(0)),

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

type ArmorEntry = {
  readonly baseAC: number
  readonly armorCategory: ArmorCategory
  readonly skillPenalty: number
}

/**
 * Predefined armor types from rulebook (06_Equipment.md)
 * skillPenalty matches the "Штраф" column values
 */
export const ARMOR_DEFINITIONS = {
  "No Protection": {
    baseAC: 11,
    armorCategory: "None",
    skillPenalty: 0
  },
  "Leather Clothing": {
    baseAC: 12,
    armorCategory: "Light",
    skillPenalty: 0
  },
  "Quilted Clothing": {
    baseAC: 13,
    armorCategory: "Light",
    skillPenalty: 0
  },
  "Scale Armor": {
    baseAC: 14,
    armorCategory: "Medium",
    skillPenalty: -1
  },
  "Chain Mail": {
    baseAC: 15,
    armorCategory: "Medium",
    skillPenalty: -2
  },
  "Plate Armor": {
    baseAC: 16,
    armorCategory: "Heavy",
    skillPenalty: -3
  },
  "Full Plate": {
    baseAC: 17,
    armorCategory: "Heavy",
    skillPenalty: -4
  }
} as const satisfies Record<string, ArmorEntry>

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
