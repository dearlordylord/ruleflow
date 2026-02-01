/**
 * Weapons - All weapon types, groups, and properties
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

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

export class WeaponComponent extends Schema.TaggedClass<WeaponComponent>()("Weapon", {
  name: Schema.NonEmptyString,
  damageDice: DiceNotation,
  damageType: Schema.Array(DamageType), // Some weapons have multiple types
  weaponGroup: WeaponGroup,
  size: WeaponSize,
  traits: Schema.Array(WeaponTrait),

  // Melee weapons
  reach: Schema.Int.pipe(Schema.greaterThanOrEqualTo(5)), // feet, default 5

  // Ranged weapons
  rangeClose: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),
  rangeMedium: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),
  rangeLong: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),

  // Durability
  durability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  maxDurability: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

/**
 * Weapon Specialization tracking (Fighter class)
 */
export class WeaponSpecializationComponent
  extends Schema.TaggedClass<WeaponSpecializationComponent>()("WeaponSpecialization", {
    // Map weapon group to damage bonus (+1 per specialization level)
    specializations: Schema.HashMap({
      key: WeaponGroup,
      value: Schema.Int.pipe(Schema.greaterThan(0))
    })
  })
{}

const EquippedWeaponsState = Schema.Union(
  Schema.Struct({
    _type: Schema.Literal("Unarmed"),
    equippedAmmunition: Schema.NullOr(EntityId)
  }),
  Schema.Struct({
    _type: Schema.Literal("OneHanded"),
    mainHand: EntityId,
    offHand: Schema.NullOr(EntityId), // Can dual-wield or use shield
    equippedAmmunition: Schema.NullOr(EntityId)
  }),
  Schema.Struct({
    _type: Schema.Literal("TwoHanded"),
    weapon: EntityId, // No offHand field exists
    equippedAmmunition: Schema.NullOr(EntityId)
  })
)
export type EquippedWeaponsState = typeof EquippedWeaponsState.Type

/**
 * Equipped weapon tracking
 */
export class EquippedWeaponsComponent extends Schema.TaggedClass<EquippedWeaponsComponent>()("EquippedWeapons", {
  state: EquippedWeaponsState
}) {}

// Re-export from weaponRegistry for backwards compatibility
export {
  WEAPON_DEFINITIONS,
  getWeaponDefinition,
  getAllWeaponNames,
  getWeaponsByGroup,
  type WeaponDefinition,
  type WeaponName
} from "./weaponRegistry.js"
