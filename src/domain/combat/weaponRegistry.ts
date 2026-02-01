/**
 * Weapon Registry - Predefined weapon definitions and lookup helpers
 */
import type { DamageType, DiceNotation, WeaponGroup, WeaponSize, WeaponTrait } from "./weapons.js"

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

/**
 * Predefined weapons from rulebook
 */
export const WEAPON_DEFINITIONS = {
  // AXES
  "Battle Axe": {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Axes" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Versatile"] as ReadonlyArray<WeaponTrait>
  },
  "Hand Axe": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Axes" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light", "Thrown"] as ReadonlyArray<WeaponTrait>
  },
  Greataxe: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Axes" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded"] as ReadonlyArray<WeaponTrait>
  },

  // CLUBS
  Club: {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Crushing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Clubs" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light"] as ReadonlyArray<WeaponTrait>
  },
  Mace: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Crushing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Clubs" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: [] as ReadonlyArray<WeaponTrait>
  },

  // BLADES (LIGHT)
  Dagger: {
    damageDice: "1d4" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Blades" as WeaponGroup,
    size: "Miniature" as WeaponSize,
    traits: ["Light", "Finesse", "Thrown"] as ReadonlyArray<WeaponTrait>
  },
  "Short Sword": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing", "Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Blades" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light", "Finesse"] as ReadonlyArray<WeaponTrait>
  },

  // BLADES (HEAVY)
  Longsword: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing", "Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Versatile"] as ReadonlyArray<WeaponTrait>
  },
  Greatsword: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Piercing", "Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded"] as ReadonlyArray<WeaponTrait>
  },

  // POLEARMS
  Spear: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["Versatile", "Thrown", "BraceForCharge"] as ReadonlyArray<WeaponTrait>
  },
  Halberd: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing", "Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Reach", "Trip", "BraceForCharge"] as ReadonlyArray<WeaponTrait>
  },
  Glaive: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Reach"] as ReadonlyArray<WeaponTrait>
  },

  // BOWS
  "Short Bow": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Bows" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["TwoHanded", "Ammunition"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 50,
    rangeMedium: 150,
    rangeLong: 300
  },
  Longbow: {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Bows" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 50,
    rangeMedium: 400,
    rangeLong: 800
  },

  // CROSSBOWS
  "Light Crossbow": {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Crossbows" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  "Heavy Crossbow": {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Crossbows" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 50,
    rangeMedium: 300,
    rangeLong: 600
  },

  // FIREARMS
  Arquebus: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Firearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Ammunition", "Loading", "MisfireRisk"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 50,
    rangeMedium: 200,
    rangeLong: 400
  },
  Pistol: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Firearms" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Ammunition", "Loading", "MisfireRisk"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 25,
    rangeMedium: 50,
    rangeLong: 100
  },

  // FLAILS
  Morningstar: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Crushing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Flails" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: ["Disarm"] as ReadonlyArray<WeaponTrait>
  },
  "Battle Flail": {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Crushing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Flails" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded"] as ReadonlyArray<WeaponTrait>
  },

  // CLUBS (additional)
  "War Pick": {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Crushing", "Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Clubs" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: [] as ReadonlyArray<WeaponTrait>
  },

  // BLADES (LIGHT) (additional)
  Cutlass: {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Blades" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Light"] as ReadonlyArray<WeaponTrait>
  },

  // BLADES (HEAVY) (additional)
  Saber: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: [] as ReadonlyArray<WeaponTrait>
  },
  Falchion: {
    damageDice: "1d8" as DiceNotation,
    damageType: ["Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "HeavyBlades" as WeaponGroup,
    size: "Medium" as WeaponSize,
    traits: [] as ReadonlyArray<WeaponTrait>
  },

  // POLEARMS (additional)
  Pollaxe: {
    damageDice: "1d10" as DiceNotation,
    damageType: ["Crushing", "Piercing", "Slashing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Polearms" as WeaponGroup,
    size: "Large" as WeaponSize,
    traits: ["TwoHanded", "Reach", "Trip", "BraceForCharge"] as ReadonlyArray<WeaponTrait>
  },

  // THROWN
  Javelin: {
    damageDice: "1d6" as DiceNotation,
    damageType: ["Piercing"] as ReadonlyArray<DamageType>,
    weaponGroup: "Thrown" as WeaponGroup,
    size: "Small" as WeaponSize,
    traits: ["Thrown"] as ReadonlyArray<WeaponTrait>,
    rangeClose: 10,
    rangeMedium: 20,
    rangeLong: 40
  }
} as const satisfies Record<string, WeaponDefinition>

export type WeaponName = keyof typeof WEAPON_DEFINITIONS

/**
 * Get a weapon definition by name
 */
export function getWeaponDefinition(name: string): WeaponDefinition | undefined {
  return WEAPON_DEFINITIONS[name as WeaponName]
}

/**
 * Get all weapon names
 */
export function getAllWeaponNames(): ReadonlyArray<WeaponName> {
  return Object.keys(WEAPON_DEFINITIONS) as Array<WeaponName>
}

/**
 * Get all weapons in a specific group
 */
export function getWeaponsByGroup(group: WeaponGroup): ReadonlyArray<WeaponName> {
  return getAllWeaponNames().filter((name) => WEAPON_DEFINITIONS[name].weaponGroup === group)
}
