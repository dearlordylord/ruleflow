/**
 * Character Progression - Experience and Leveling
 */
import { Schema } from "effect"

/**
 * Experience thresholds for each level (1-10)
 */
export const EXPERIENCE_THRESHOLDS = [
  0, // Level 1
  1000, // Level 2
  2000, // Level 3
  4000, // Level 4
  8000, // Level 5
  16000, // Level 6
  32000, // Level 7
  64000, // Level 8
  128000, // Level 9
  256000 // Level 10
] as const

/**
 * Experience and level progression
 */
export class ExperienceComponent extends Schema.TaggedClass<ExperienceComponent>()("Experience", {
  currentXP: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  level: Schema.Int.pipe(Schema.between(1, 10))
}) {}

/**
 * Calculate level from XP
 */
export function calculateLevelFromXP(xp: number): number {
  for (let level = 10; level >= 1; level--) {
    if (xp >= EXPERIENCE_THRESHOLDS[level - 1]) {
      return level
    }
  }
  return 1
}

/**
 * XP needed for next level
 */
export function xpToNextLevel(currentLevel: number): number | null {
  if (currentLevel >= 10) return null // Max level
  return EXPERIENCE_THRESHOLDS[currentLevel] - EXPERIENCE_THRESHOLDS[currentLevel - 1]
}

/**
 * Trait selection tracking
 * Traits gained at levels 1, 3, 5, 7, 9
 */
export class TraitProgressionComponent extends Schema.TaggedClass<TraitProgressionComponent>()("TraitProgression", {
  // Trait slots available per level milestone
  traitsAvailableAtLevel1: Schema.Boolean,
  traitsAvailableAtLevel3: Schema.Boolean,
  traitsAvailableAtLevel5: Schema.Boolean,
  traitsAvailableAtLevel7: Schema.Boolean,
  traitsAvailableAtLevel9: Schema.Boolean,

  // Can exchange trait for additional skill
  exchangedTraitForSkill: Schema.Array(Schema.Int.pipe(Schema.between(1, 9)))
}) {}

/**
 * Starting equipment budget based on level
 * Level 1: 3d6 × 10 sm
 * Level 2+: 180 sm + 3d6 × 10 sm per level above 1
 */
export function calculateStartingCurrency(level: number): number {
  if (level === 1) {
    // Will be rolled: 3d6 × 10
    return 0 // Placeholder, actual roll happens at character creation
  }
  // 180 + (level - 1) × 3d6 × 10
  return 180 // Base, plus rolls for each level
}
