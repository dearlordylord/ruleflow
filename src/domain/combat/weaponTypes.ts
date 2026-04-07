/**
 * Weapon Types - Shared type schemas used by both weapons.ts and weaponRegistry.ts
 * Extracted to break circular dependency between weapons and weaponRegistry.
 */
import { Schema } from "effect"

// Dice notation pattern from existing codebase
const diceNotationPattern = /^\d+d\d+(?:[+-]\d+)?$/

export const DiceNotation = Schema.String.pipe(
  Schema.filter((input): input is string => diceNotationPattern.test(input), {
    message: () => "Invalid dice notation (expected: NdN, NdN+M, or NdN-M)"
  }),
  Schema.brand("DiceNotation")
)
export type DiceNotation = typeof DiceNotation.Type

/**
 * Weapon groups for specialization
 */
export const WeaponGroup = Schema.Literal(
  "Axes",
  "Blades", // Light blades
  "HeavyBlades",
  "Bows",
  "Brawling",
  "Clubs",
  "Crossbows",
  "Flails",
  "Polearms",
  "Firearms",
  "Slings",
  "Spears",
  "Staves",
  "Thrown"
)
export type WeaponGroup = typeof WeaponGroup.Type

/**
 * Damage types
 */
export const DamageType = Schema.Literal(
  "Crushing", // D (дробящий)
  "Piercing", // P (проникающий)
  "Slashing" // R (режущий)
)
export type DamageType = typeof DamageType.Type

/**
 * Weapon size categories
 */
export const WeaponSize = Schema.Literal("Miniature", "Small", "Medium", "Large", "Massive")
export type WeaponSize = typeof WeaponSize.Type

/**
 * Weapon traits/properties
 */
export const WeaponTrait = Schema.Literal(
  "Reach", // Long polearms
  "Versatile", // Can use 1H or 2H
  "TwoHanded",
  "Light", // Dual-wield friendly
  "Finesse", // Can use DEX for attack
  "Thrown",
  "Ammunition",
  "Loading", // Requires reload action
  "MisfireRisk", // Firearms 1-in-6 chance
  "BraceForCharge", // Polearms vs charging enemies
  "Disarm", // Can be used to disarm
  "Trip" // Can trip/sweep
)
export type WeaponTrait = typeof WeaponTrait.Type
