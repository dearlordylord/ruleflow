/**
 * Concentration Points - Mystic spellcasting resource
 */
import { Schema } from "effect"

/**
 * Concentration points for casting mysteries
 * Base: From table per level
 * Bonus: floor(will × level × 0.5)
 */
export class ConcentrationComponent extends Schema.TaggedClass<ConcentrationComponent>()("Concentration", {
  // Maximum concentration points
  maxPoints: Schema.Int.pipe(Schema.greaterThan(0)),

  // Current available points
  currentPoints: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Currently concentrating on a mystery
  activeConcentration: Schema.NullOr(Schema.NonEmptyString), // Mystery name

  // Concentration check bonuses/penalties
  concentrationBonus: Schema.Int
}) {}

/**
 * Base CP per level (before Will modifier bonus)
 */
export const MYSTIC_CONCENTRATION_POINTS_BASE = [
  2, 4, 7, 10, 14, 18, 23, 28, 34, 40 // Levels 1-10
] as const

/**
 * Calculate max concentration points
 * Formula: base[level-1] + floor(willModifier × level × 0.5)
 */
export function calculateMaxConcentrationPoints(
  level: number,
  willModifier: number
): number {
  const base = MYSTIC_CONCENTRATION_POINTS_BASE[Math.min(level, 10) - 1] ?? 2
  const bonus = Math.floor(willModifier * level * 0.5)
  return Math.max(1, base + bonus)
}

/**
 * Mystery slots per level [tier1, tier2, tier3, tier4, tier5]
 * Before Intelligence modifier bonus
 */
export const MYSTERY_SLOTS_BY_LEVEL = [
  [1, 0, 0, 0, 0], // Level 1
  [2, 0, 0, 0, 0], // Level 2
  [2, 1, 0, 0, 0], // Level 3
  [2, 2, 0, 0, 0], // Level 4
  [2, 2, 1, 0, 0], // Level 5
  [2, 2, 2, 0, 0], // Level 6
  [3, 2, 2, 1, 0], // Level 7
  [3, 2, 2, 2, 0], // Level 8
  [3, 3, 2, 2, 1], // Level 9
  [3, 3, 2, 2, 2]  // Level 10
] as const

/**
 * Intelligence modifier bonus to mystery slots
 * Complex table from rulebook p.82
 */
const INT_MODIFIER_SLOT_BONUS: Record<string, [number, number, number, number, number]> = {
  '-3': [0, 0, 0, 0, 0],
  '-2': [0, 0, 0, 0, 0],
  '-1': [0, 0, 0, 0, 0],
  '0': [0, 0, 0, 0, 0],
  '1': [1, 0, 0, 0, 0],
  '2': [1, 1, 0, 0, 0],
  '3': [1, 1, 1, 0, 0],
  '4': [1, 1, 1, 1, 0],
  '5': [2, 1, 1, 1, 1],
  '6': [2, 2, 1, 1, 1],
  '7': [2, 2, 2, 1, 1],
  '8': [2, 2, 2, 2, 1],
  '9': [3, 2, 2, 2, 2]
}

/**
 * Get total mystery slots including INT modifier bonus
 */
export function getMysterySlots(
  level: number,
  intModifier: number
): [number, number, number, number, number] {
  const baseSlots = MYSTERY_SLOTS_BY_LEVEL[Math.min(level, 10) - 1] ?? [0, 0, 0, 0, 0]
  const clampedMod = Math.max(-3, Math.min(9, intModifier))
  const bonusSlots = INT_MODIFIER_SLOT_BONUS[clampedMod.toString()] ?? [0, 0, 0, 0, 0]

  return [
    baseSlots[0]! + bonusSlots[0]!,
    baseSlots[1]! + bonusSlots[1]!,
    baseSlots[2]! + bonusSlots[2]!,
    baseSlots[3]! + bonusSlots[3]!,
    baseSlots[4]! + bonusSlots[4]!
  ]
}

/**
 * Concentration check for maintaining spells under duress
 * DC = 10 + damage taken (or other distraction value)
 */
export function concentrationCheckDC(damageOrDistraction: number): number {
  return 10 + damageOrDistraction
}
