/**
 * Equipment Prices
 * All prices in copper pieces (converted from rulebook silver prices × 10)
 */

/**
 * Weapon prices from rulebook
 * Source: rulebook/06_Equipment.md lines 5-54
 */
export const WEAPON_PRICES = {
  // AXES
  "Battle Axe": 200, // 20 silver
  "Hand Axe": 100, // 10 silver
  Greataxe: 400, // 40 silver

  // CLUBS AND HAMMERS
  Club: 50, // 5 silver
  Mace: 200, // 20 silver
  "War Pick": 250, // 25 silver

  // BLADES (LIGHT)
  Dagger: 100, // 10 silver
  Cutlass: 150, // 15 silver
  "Short Sword": 200, // 20 silver

  // BLADES (HEAVY)
  Longsword: 500, // 50 silver
  Saber: 250, // 25 silver
  Falchion: 250, // 25 silver
  Greatsword: 1000, // 100 silver
  Kriegsmesser: 500, // 50 silver

  // POLEARMS
  Spear: 250, // 25 silver
  Halberd: 400, // 40 silver
  Glaive: 350, // 35 silver
  Pollaxe: 500, // 50 silver

  // BOWS
  "Short Bow": 200, // 20 silver
  Longbow: 400, // 40 silver

  // CROSSBOWS
  "Light Crossbow": 200, // 20 silver
  "Heavy Crossbow": 400, // 40 silver

  // FIREARMS
  Arquebus: 500, // 50 silver
  Pistol: 500, // 50 silver

  // FLAILS
  Morningstar: 200, // 20 silver
  "Battle Flail": 400, // 40 silver

  // THROWN
  Sling: 10, // 1 silver
  Javelin: 50 // 5 silver
} as const

/**
 * Armor prices from rulebook
 * Source: rulebook/06_Equipment.md lines 5-14
 */
export const ARMOR_PRICES = {
  "No Protection": 0, // 0 silver
  "Leather Clothing": 200, // 20 silver
  "Quilted Clothing": 500, // 50 silver
  "Scale Armor": 1000, // 100 silver
  "Chain Mail": 2500, // 250 silver
  "Plate Armor": 5000, // 500 silver
  "Full Plate": 10000, // 1000 silver
  Shield: 150 // 15 silver
} as const

/**
 * Combined equipment prices lookup
 */
export const EQUIPMENT_PRICES = {
  ...WEAPON_PRICES,
  ...ARMOR_PRICES
} as const

/**
 * Helper to get equipment price in copper
 */
export function getEquipmentPrice(equipmentName: string): number | undefined {
  return EQUIPMENT_PRICES[equipmentName as keyof typeof EQUIPMENT_PRICES]
}

/**
 * Helper to convert copper to silver for display
 */
export function copperToSilver(copper: number): number {
  return copper / 10
}

/**
 * Helper to convert silver to copper
 */
export function silverToCopper(silver: number): number {
  return silver * 10
}
