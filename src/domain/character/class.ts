/**
 * Character Classes and Class-Specific Abilities
 */
import { Schema } from "effect"

import type { SetClassMutation } from "./mutations.js"

export const CharacterClass = Schema.Literal("Fighter", "Specialist", "Mystic")
export type CharacterClass = typeof CharacterClass.Type

const DEFAULT_CLASS = {
  class: "Fighter" as const,
  level: 1
}

export class ClassComponent extends Schema.TaggedClass<ClassComponent>()("Class", {
  class: CharacterClass,
  level: Schema.Int.pipe(Schema.between(1, 10))
}) {
  static applyMutation(
    existing: ClassComponent | null,
    mutation: SetClassMutation
  ): ClassComponent {
    const base = existing ?? ClassComponent.make(DEFAULT_CLASS)
    return ClassComponent.make({
      class: mutation.data.class ?? base.class,
      level: mutation.data.level ?? base.level
    })
  }
}

/**
 * Fighter: Combat Superiority
 * Level 2+: Extra attacks against new targets within 5 feet (chain attacks)
 */
export class CombatSuperiorityComponent extends Schema.TaggedClass<CombatSuperiorityComponent>()("CombatSuperiority", {
  // Number of extra attacks per round (1 at level 2, +1 every 2 levels)
  extraAttacksPerRound: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Tracking attacks used in current round
  attacksUsedThisRound: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Must hit to continue chain
  chainActive: Schema.Boolean
}) {}

/**
 * Specialist: Sneak Attack
 * Level 1: +1d6, increases at levels 3, 6, 9
 */
export class SneakAttackComponent extends Schema.TaggedClass<SneakAttackComponent>()("SneakAttack", {
  // Number of d6 to add (1→2→3→4 at levels 1/3/6/9)
  extraDamageDice: Schema.Int.pipe(Schema.between(1, 4))
}) {}

/**
 * Specialist: Lucky Skill
 * Luck points for skill check re-rolls
 */
export class LuckySkillComponent extends Schema.TaggedClass<LuckySkillComponent>()("LuckySkill", {
  // Total points: 5 + level
  maxPoints: Schema.Int.pipe(Schema.greaterThanOrEqualTo(5)),

  // Current available points
  currentPoints: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Recovery die size (1d4 at level 1, increases to 1d12 at level 9)
  recoveryDieSize: Schema.Int.pipe(Schema.between(4, 12))
}) {}

/**
 * Mystic: Forbidden Knowledge
 * Artifact identification ability
 */
export class ForbiddenKnowledgeComponent
  extends Schema.TaggedClass<ForbiddenKnowledgeComponent>()("ForbiddenKnowledge", {
    // DC 15-20 for identifying supernatural artifacts
    identificationBonus: Schema.Int,

    // Known artifact properties (accumulated knowledge)
    knownArtifacts: Schema.Array(Schema.String)
  })
{}

/**
 * Calculate number of extra attacks per round for Combat Superiority
 * Level 2: 1, Level 4: 2, Level 6: 3, Level 8: 4, Level 10: 5
 */
export function calculateCombatSuperiorityExtraAttacks(level: number): number {
  if (level < 2) return 0
  return Math.floor(level / 2)
}

/**
 * Calculate sneak attack dice for Specialist
 * Level 1: 1d6, Level 3: 2d6, Level 6: 3d6, Level 9: 4d6
 */
export function calculateSneakAttackDice(level: number): number {
  if (level >= 9) return 4
  if (level >= 6) return 3
  if (level >= 3) return 2
  return 1
}

/**
 * Calculate luck point recovery die size for Specialist
 * Level 1: 1d4, Level 3: 1d6, Level 5: 1d8, Level 7: 1d10, Level 9: 1d12
 */
export function calculateLuckySkillRecoveryDie(level: number): number {
  return Math.min(12, 4 + Math.floor((level - 1) / 2) * 2)
}

/**
 * Calculate max mystery tier available for Mystic
 * Level 1-2: Tier 1, Level 3-4: Tier 2, Level 5-6: Tier 3, Level 7-8: Tier 4, Level 9-10: Tier 5
 */
export function calculateMaxMysteryTier(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level >= 9) return 5
  if (level >= 7) return 4
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 1
}

/**
 * HP Die Tables
 * Level 1: Fixed die + fixed bonus
 * Per level after: Rolling die
 */
export const HP_DIE_BY_CLASS = {
  Fighter: { level1: "1d4+4", perLevel: "1d8" },
  Specialist: { level1: "1d3+3", perLevel: "1d6" },
  Mystic: { level1: "1d3+3", perLevel: "1d6" }
} as const

/**
 * Class Titles by Level (1-10)
 * Note: Specialist level 2 "Adept" (Знаток) vs level 4 "Expert" (Эксперт) are different Russian terms
 */
export const CLASS_TITLES: Record<CharacterClass, ReadonlyArray<string>> = {
  Fighter: ["Soldier", "Veteran", "Warrior", "Knight", "Champion", "Hero", "Hero", "Hero", "Hero", "Hero"],
  Specialist: [
    "Dilettante",
    "Adept",
    "Professional",
    "Expert",
    "Master",
    "Grandmaster",
    "Grandmaster",
    "Grandmaster",
    "Grandmaster",
    "Grandmaster"
  ],
  Mystic: [
    "Acolyte",
    "Adept",
    "Theurge",
    "Hierophant",
    "Apostle",
    "Prophet",
    "Prophet",
    "Prophet",
    "Prophet",
    "Prophet"
  ]
} as const

/**
 * Get class title for character at given level
 */
export function getClassTitle(characterClass: CharacterClass, level: number): string {
  const titles = CLASS_TITLES[characterClass]
  return titles[Math.min(level, 10) - 1] ?? titles[titles.length - 1]!
}

/**
 * Get HP die notation for character at given level
 */
export function getHPDieNotation(characterClass: CharacterClass, level: number): string {
  const dice = HP_DIE_BY_CLASS[characterClass]
  return level === 1 ? dice.level1 : dice.perLevel
}

/**
 * Fighter: Weapon specialization bonus progression
 * Levels 1-2: +1, 3-4: +2, 5-6: +3, 7-8: +4, 9-10: +5
 */
export function getWeaponSpecializationBonus(level: number): number {
  return Math.min(5, Math.floor((level + 1) / 2))
}
