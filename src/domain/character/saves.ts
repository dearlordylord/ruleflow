/**
 * Saving Throws - Six types of saves
 */
import { Schema } from "effect"

import type { SetSavingThrowsMutation } from "./mutations.js"

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

const DEFAULT_SAVING_THROWS = {
  baseSaveBonus: 0,
  restraintModifier: 0,
  exhaustionModifier: 0,
  dodgeModifier: 0,
  suppressionModifier: 0,
  confusionModifier: 0,
  curseModifier: 0
} as const

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
}) {
  static applyMutation(
    existing: SavingThrowsComponent | null,
    mutation: SetSavingThrowsMutation
  ): SavingThrowsComponent {
    const base = existing ?? SavingThrowsComponent.make(DEFAULT_SAVING_THROWS)
    return SavingThrowsComponent.make({
      baseSaveBonus: mutation.data.baseSaveBonus ?? base.baseSaveBonus,
      restraintModifier: mutation.data.restraintModifier ?? base.restraintModifier,
      exhaustionModifier: mutation.data.exhaustionModifier ?? base.exhaustionModifier,
      dodgeModifier: mutation.data.dodgeModifier ?? base.dodgeModifier,
      suppressionModifier: mutation.data.suppressionModifier ?? base.suppressionModifier,
      confusionModifier: mutation.data.confusionModifier ?? base.confusionModifier,
      curseModifier: mutation.data.curseModifier ?? base.curseModifier
    })
  }
}

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
