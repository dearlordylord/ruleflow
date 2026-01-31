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
