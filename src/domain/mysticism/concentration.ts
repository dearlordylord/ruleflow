/**
 * Concentration Points - Mystic spellcasting resource
 */
import { Schema } from "effect"

/**
 * Concentration points for casting mysteries
 * Base: Intelligence modifier
 * Increases with level
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
 * Calculate max concentration points
 * Base = Int modifier, +1 per level
 */
export function calculateMaxConcentrationPoints(
  intelligenceModifier: number,
  level: number
): number {
  return Math.max(1, intelligenceModifier + level)
}

/**
 * Concentration check for maintaining spells under duress
 * DC = 10 + damage taken (or other distraction value)
 */
export function concentrationCheckDC(damageOrDistraction: number): number {
  return 10 + damageOrDistraction
}
