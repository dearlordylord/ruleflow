/**
 * Weapon Registry - Predefined weapon definitions and lookup helpers
 */
import { Schema } from "effect"

import type { DamageType, WeaponGroup, WeaponSize, WeaponTrait } from "./weaponTypes.js"
import { DiceNotation } from "./weaponTypes.js"

/**
 * Weapon definition shape (without runtime fields like durability)
 */
export type WeaponDefinition = {
  damageDice: DiceNotation
  damageType: ReadonlyArray<DamageType>
  weaponGroup: WeaponGroup
  size: WeaponSize
  traits: ReadonlyArray<WeaponTrait>
  rangeClose?: number
  rangeMedium?: number
  rangeLong?: number
}

const dice = Schema.decodeSync(DiceNotation)

/**
 * Predefined weapons from rulebook
 */
export const WEAPON_DEFINITIONS = {
  // AXES
  "Battle Axe": {
    damageDice: dice("1d8"),
    damageType: ["Slashing"],
    weaponGroup: "Axes",
    size: "Medium",
    traits: ["Versatile"]
  },
  "Hand Axe": {
    damageDice: dice("1d6"),
    damageType: ["Slashing"],
    weaponGroup: "Axes",
    size: "Small",
    traits: ["Light", "Thrown"]
  },
  Greataxe: {
    damageDice: dice("1d10"),
    damageType: ["Slashing"],
    weaponGroup: "Axes",
    size: "Large",
    traits: ["TwoHanded"]
  },

  // CLUBS
  Club: {
    damageDice: dice("1d6"),
    damageType: ["Crushing"],
    weaponGroup: "Clubs",
    size: "Small",
    traits: ["Light"]
  },
  Mace: {
    damageDice: dice("1d8"),
    damageType: ["Crushing"],
    weaponGroup: "Clubs",
    size: "Medium",
    traits: [] as const
  },

  // BLADES (LIGHT)
  Dagger: {
    damageDice: dice("1d4"),
    damageType: ["Piercing"],
    weaponGroup: "Blades",
    size: "Miniature",
    traits: ["Light", "Finesse", "Thrown"]
  },
  "Short Sword": {
    damageDice: dice("1d6"),
    damageType: ["Piercing", "Slashing"],
    weaponGroup: "Blades",
    size: "Small",
    traits: ["Light", "Finesse"]
  },

  // BLADES (HEAVY)
  Longsword: {
    damageDice: dice("1d8"),
    damageType: ["Piercing", "Slashing"],
    weaponGroup: "HeavyBlades",
    size: "Medium",
    traits: ["Versatile"]
  },
  Greatsword: {
    damageDice: dice("1d10"),
    damageType: ["Piercing", "Slashing"],
    weaponGroup: "HeavyBlades",
    size: "Large",
    traits: ["TwoHanded"]
  },

  // POLEARMS
  Spear: {
    damageDice: dice("1d8"),
    damageType: ["Piercing"],
    weaponGroup: "Polearms",
    size: "Large",
    traits: ["Versatile", "Thrown", "BraceForCharge"]
  },
  Halberd: {
    damageDice: dice("1d8"),
    damageType: ["Slashing", "Piercing"],
    weaponGroup: "Polearms",
    size: "Large",
    traits: ["TwoHanded", "Reach", "Trip", "BraceForCharge"]
  },
  Glaive: {
    damageDice: dice("1d8"),
    damageType: ["Slashing"],
    weaponGroup: "Polearms",
    size: "Large",
    traits: ["TwoHanded", "Reach"]
  },

  // BOWS
  "Short Bow": {
    damageDice: dice("1d6"),
    damageType: ["Piercing"],
    weaponGroup: "Bows",
    size: "Medium",
    traits: ["TwoHanded", "Ammunition"],
    rangeClose: 50,
    rangeMedium: 150,
    rangeLong: 300
  },
  Longbow: {
    damageDice: dice("1d6"),
    damageType: ["Piercing"],
    weaponGroup: "Bows",
    size: "Large",
    traits: ["TwoHanded", "Ammunition"],
    rangeClose: 50,
    rangeMedium: 400,
    rangeLong: 800
  },

  // CROSSBOWS
  "Light Crossbow": {
    damageDice: dice("1d6"),
    damageType: ["Piercing"],
    weaponGroup: "Crossbows",
    size: "Medium",
    traits: ["TwoHanded", "Ammunition", "Loading"],
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  "Heavy Crossbow": {
    damageDice: dice("1d8"),
    damageType: ["Piercing"],
    weaponGroup: "Crossbows",
    size: "Large",
    traits: ["TwoHanded", "Ammunition", "Loading"],
    rangeClose: 50,
    rangeMedium: 300,
    rangeLong: 600
  },

  // FIREARMS
  Arquebus: {
    damageDice: dice("1d10"),
    damageType: ["Piercing"],
    weaponGroup: "Firearms",
    size: "Large",
    traits: ["TwoHanded", "Ammunition", "Loading", "MisfireRisk"],
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  Pistol: {
    damageDice: dice("1d8"),
    damageType: ["Piercing"],
    weaponGroup: "Firearms",
    size: "Small",
    traits: ["Ammunition", "Loading", "MisfireRisk"],
    rangeClose: 25,
    rangeMedium: 50,
    rangeLong: 100
  },

  // FLAILS
  Morningstar: {
    damageDice: dice("1d8"),
    damageType: ["Crushing"],
    weaponGroup: "Flails",
    size: "Medium",
    traits: ["Disarm"]
  },
  "Battle Flail": {
    damageDice: dice("1d10"),
    damageType: ["Crushing"],
    weaponGroup: "Flails",
    size: "Large",
    traits: ["TwoHanded"]
  },

  // CLUBS (additional)
  "War Pick": {
    damageDice: dice("1d8"),
    damageType: ["Crushing", "Piercing"],
    weaponGroup: "Clubs",
    size: "Medium",
    traits: [] as const
  },

  // BLADES (LIGHT) (additional)
  Cutlass: {
    damageDice: dice("1d6"),
    damageType: ["Slashing"],
    weaponGroup: "Blades",
    size: "Small",
    traits: ["Light"]
  },

  // BLADES (HEAVY) (additional)
  Saber: {
    damageDice: dice("1d8"),
    damageType: ["Slashing"],
    weaponGroup: "HeavyBlades",
    size: "Medium",
    traits: [] as const
  },
  Falchion: {
    damageDice: dice("1d8"),
    damageType: ["Slashing"],
    weaponGroup: "HeavyBlades",
    size: "Medium",
    traits: [] as const
  },

  // POLEARMS (additional)
  Pollaxe: {
    damageDice: dice("1d10"),
    damageType: ["Crushing", "Piercing", "Slashing"],
    weaponGroup: "Polearms",
    size: "Large",
    traits: ["TwoHanded", "Reach", "Trip", "BraceForCharge"]
  },

  // THROWN
  Javelin: {
    damageDice: dice("1d6"),
    damageType: ["Piercing"],
    weaponGroup: "Thrown",
    size: "Small",
    traits: ["Thrown"],
    rangeClose: 10,
    rangeMedium: 20,
    rangeLong: 40
  }
} satisfies Record<string, WeaponDefinition>

export type WeaponName = keyof typeof WEAPON_DEFINITIONS

function isWeaponName(name: string): name is WeaponName {
  return name in WEAPON_DEFINITIONS
}

/**
 * Get a weapon definition by name
 */
export function getWeaponDefinition(name: string): WeaponDefinition | undefined {
  return isWeaponName(name) ? WEAPON_DEFINITIONS[name] : undefined
}

/**
 * Get all weapon names (typed via Object.keys + type guard)
 */
export function getAllWeaponNames(): ReadonlyArray<WeaponName> {
  return Object.keys(WEAPON_DEFINITIONS).filter(isWeaponName)
}

/**
 * Get all weapons in a specific group
 */
export function getWeaponsByGroup(group: WeaponGroup): ReadonlyArray<WeaponName> {
  return getAllWeaponNames().filter((name) => WEAPON_DEFINITIONS[name].weaponGroup === group)
}
