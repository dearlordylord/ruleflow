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
export class WeaponSpecializationComponent extends Schema.TaggedClass<WeaponSpecializationComponent>()("WeaponSpecialization", {
  // Map weapon group to damage bonus (+1 per specialization level)
  specializations: Schema.HashMap({
    key: WeaponGroup,
    value: Schema.Int.pipe(Schema.greaterThan(0))
  })
}) {}

/**
 * Equipped weapon tracking
 */
export class EquippedWeaponsComponent extends Schema.TaggedClass<EquippedWeaponsComponent>()("EquippedWeapons", {
  mainHand: Schema.NullOr(EntityId),
  offHand: Schema.NullOr(EntityId),

  // Ammunition for ranged weapons
  equippedAmmunition: Schema.NullOr(EntityId)
}) {}

/**
 * Predefined weapons from rulebook
 */
export const WEAPON_DEFINITIONS = {
  // AXES
  "Battle Axe": {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "Axes" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Versatile"] as WeaponTrait[]
  },
  "Hand Axe": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "Axes" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light", "Thrown"] as WeaponTrait[]
  },
  Greataxe: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "Axes" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded"] as WeaponTrait[]
  },

  // CLUBS
  Club: {
    damageDice: "1d4" as DiceNotation,
    damageType: ["Crushing"] as DamageType[],
    weaponGroup: "Clubs" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light"] as WeaponTrait[]
  },
  Mace: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Crushing"] as DamageType[],
    weaponGroup: "Clubs" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: [] as WeaponTrait[]
  },

  // BLADES (LIGHT)
  Dagger: {
    damageDice: "1d4" as DiceNotation,
    damageType: ["Piercing", "Slashing"] as DamageType[],
    weaponGroup: "Blades" as WeaponGroup,
    size: "Miniature" as WeaponSize,
    traits: ["Light", "Finesse", "Thrown"] as WeaponTrait[]
  },
  "Short Sword": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing", "Slashing"] as DamageType[],
    weaponGroup: "Blades" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light", "Finesse"] as WeaponTrait[]
  },

  // BLADES (HEAVY)
  Longsword: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Versatile"] as WeaponTrait[]
  },
  Greatsword: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded"] as WeaponTrait[]
  },

  // POLEARMS
  Spear: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Versatile", "Thrown", "BraceForCharge"] as WeaponTrait[]
  },
  Halberd: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Slashing", "Piercing"] as DamageType[],
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Reach", "Trip", "BraceForCharge"] as WeaponTrait[]
  },
  Glaive: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Slashing"] as DamageType[],
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Reach"] as WeaponTrait[]
  },

  // BOWS
  "Short Bow": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Bows" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["TwoHanded", "Ammunition"] as WeaponTrait[],
    rangeClose: 50,
    rangeMedium: 150,
    rangeLong: 300
  },
  Longbow: {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Bows" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition"] as WeaponTrait[],
    rangeClose: 50,
    rangeMedium: 400,
    rangeLong: 800
  },

  // CROSSBOWS
  "Light Crossbow": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Crossbows" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading"] as WeaponTrait[],
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  "Heavy Crossbow": {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Crossbows" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading"] as WeaponTrait[],
    rangeClose: 50,
    rangeMedium: 300,
    rangeLong: 600
  },

  // FIREARMS
  Arquebus: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Firearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading", "MisfireRisk"] as WeaponTrait[],
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  Pistol: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as DamageType[],
    weaponGroup: "Firearms" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Ammunition", "Loading", "MisfireRisk"] as WeaponTrait[],
    rangeClose: 25,
    rangeMedium: 50,
    rangeLong: 100
  }
} as const
