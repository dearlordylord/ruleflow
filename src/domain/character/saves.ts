/**
 * Saving Throws - Six types of saves
 */
import { Schema } from "effect"

/**
 * Six saving throw types matching OSR rules
 */
export const SaveType = Schema.Literal(
  "Restraint", // Удержание (Сил) - effects limiting mobility, physical resistance
  "Exhaustion", // Истощение (Вын) - diseases, poisons, hardships
  "Dodge", // Поражение (Лов) - area attacks, explosions, need to dodge/seek cover
  "Suppression", // Подавление (Вол) - will-breaking, concentration disruption
  "Confusion", // Смятение (Инт) - mind/perception/reason effects
  "Curse" // Проклятие (Хар) - supernatural forces beyond direct control
)
export type SaveType = typeof SaveType.Type

/**
 * Saving throws component
 * Base save bonus = same for all six types, depends on level
 * Final save = base bonus + relevant attribute modifier
 */
export class SavingThrowsComponent extends Schema.TaggedClass<SavingThrowsComponent>()("SavingThrows", {
  // Base bonus (0 at level 1, scales to +5 at level 10)
  baseSaveBonus: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Individual save modifiers (from traits, conditions, etc.)
  restraintModifier: Schema.Int,
  exhaustionModifier: Schema.Int,
  dodgeModifier: Schema.Int,
  suppressionModifier: Schema.Int,
  confusionModifier: Schema.Int,
  curseModifier: Schema.Int
}) {}

/**
 * Calculate final save bonus
 * Total = BaseSaveBonus + AttributeModifier + SaveModifier
 */
export function calculateSaveBonus(
  saves: SavingThrowsComponent,
  saveType: SaveType,
  attributeModifier: number
): number {
  const saveModifier = {
    Restraint: saves.restraintModifier,
    Exhaustion: saves.exhaustionModifier,
    Dodge: saves.dodgeModifier,
    Suppression: saves.suppressionModifier,
    Confusion: saves.confusionModifier,
    Curse: saves.curseModifier
  }[saveType]

  return saves.baseSaveBonus + attributeModifier + saveModifier
}

/**
 * Get save base bonus from character level
 * 0→+1→+1→+2→+2→+3→+3→+4→+4→+5 (levels 1-10)
 */
export function calculateBaseSaveBonus(characterLevel: number): number {
  const progression = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5]
  return progression[Math.min(characterLevel, 10) - 1] ?? 0
}
