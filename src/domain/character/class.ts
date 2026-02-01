/**
 * Character Classes and Class-Specific Abilities
 */
import { Schema } from "effect"

export const CharacterClass = Schema.Literal("Fighter", "Specialist", "Mystic")
export type CharacterClass = typeof CharacterClass.Type

export class ClassComponent extends Schema.TaggedClass<ClassComponent>()("Class", {
  class: CharacterClass,
  level: Schema.Int.pipe(Schema.between(1, 10))
}) {}

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
export class ForbiddenKnowledgeComponent extends Schema.TaggedClass<ForbiddenKnowledgeComponent>()("ForbiddenKnowledge", {
  // DC 15-20 for identifying supernatural artifacts
  identificationBonus: Schema.Int,

  // Known artifact properties (accumulated knowledge)
  knownArtifacts: Schema.Array(Schema.String)
}) {}

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
export const CLASS_TITLES: Record<CharacterClass, readonly string[]> = {
  Fighter: ["Soldier", "Veteran", "Warrior", "Knight", "Champion", "Hero", "Hero", "Hero", "Hero", "Hero"],
  Specialist: ["Dilettante", "Adept", "Professional", "Expert", "Master", "Grandmaster", "Grandmaster", "Grandmaster", "Grandmaster", "Grandmaster"],
  Mystic: ["Acolyte", "Adept", "Theurge", "Hierophant", "Apostle", "Prophet", "Prophet", "Prophet", "Prophet", "Prophet"]
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
 * Fighter: Extra attacks per round
 * Formula: floor(level/2) - 1, minimum 0
 */
export function getExtraAttacksPerRound(level: number): number {
  return Math.max(0, Math.floor(level / 2) - 1)
}

/**
 * Fighter: Weapon specialization bonus progression
 * Levels 1-2: +1, 3-4: +2, 5-6: +3, 7-8: +4, 9-10: +5
 */
export function getWeaponSpecializationBonus(level: number): number {
  return Math.min(5, Math.floor((level + 1) / 2))
}

/**
 * Specialist: Sneak attack dice progression
 * Level 1-2: 1d6, 3-5: 2d6, 6-8: 3d6, 9-10: 4d6
 */
export function getSneakAttackDice(level: number): 1 | 2 | 3 | 4 {
  if (level >= 9) return 4
  if (level >= 6) return 3
  if (level >= 3) return 2
  return 1
}

/**
 * Specialist: Luck recovery die progression
 * Level 1-2: d4, 3-4: d6, 5-6: d8, 7-8: d10, 9-10: d12
 */
export function getLuckRecoveryDie(level: number): 4 | 6 | 8 | 10 | 12 {
  if (level >= 9) return 12
  if (level >= 7) return 10
  if (level >= 5) return 8
  if (level >= 3) return 6
  return 4
}
