/**
 * Combat Statistics
 */
import { Schema } from "effect"

export class CombatStatsComponent extends Schema.TaggedClass<CombatStatsComponent>()("CombatStats", {
  meleeAttackBonus: Schema.Int,
  rangedAttackBonus: Schema.Int,
  armorClass: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Initiative modifier (from Combat Reflexes trait, dexterity, etc.)
  initiativeModifier: Schema.Int
}) {}

/**
 * Armor Class calculation helper
 * Final AC = BaseAC + DexterityModifier + ShieldBonus + CoverBonus + Situational
 */
export function calculateAC(
  baseAC: number,
  dexterityMod: number,
  shieldBonus: number = 0,
  coverBonus: number = 0,
  situationalMod: number = 0
): number {
  return baseAC + dexterityMod + shieldBonus + coverBonus + situationalMod
}
