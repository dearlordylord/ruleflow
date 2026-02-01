/**
 * Skills System - All 15 OSR skills with progression
 */
import { Schema } from "effect"

/**
 * Skill proficiency levels
 * - Untrained: base attribute modifier only
 * - Primary: +2 at level 1, scales to +8 at level 10
 * - Secondary: +1 at level 1, scales to +5 at level 10
 */
export const SkillProficiency = Schema.Literal("Untrained", "Primary", "Secondary")
export type SkillProficiency = typeof SkillProficiency.Type

/**
 * Skill check difficulty classes
 */
export const SkillDC = {
  Simple: 10,
  Moderate: 12,
  Challenging: 15,
  Hard: 18,
  Extreme: 20
} as const

/**
 * Individual skill definition
 */
export class Skill extends Schema.Class<Skill>("Skill")({
  proficiency: SkillProficiency,
  // Bonus from character level (calculated based on proficiency + level)
  levelBonus: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

/**
 * All 15 skills attached to a character
 */
export class SkillsComponent extends Schema.TaggedClass<SkillsComponent>()("Skills", {
  // Physical Skills (Strength)
  melee: Skill, // Melee Combat - melee attacks and wrestling
  might: Skill, // Might - moving/holding heavy objects, breaking doors

  // Physical Skills (Dexterity)
  accuracy: Skill, // Accuracy - ranged weapon attacks
  movement: Skill, // Movement - climbing, swimming, jumping, balance
  sleightOfHand: Skill, // Sleight of Hand - lockpicking, mechanisms, pickpocketing
  stealth: Skill, // Stealth - hiding, sneaking, avoiding detection

  // Mental Skills (Intelligence)
  alchemy: Skill, // Alchemy - substance/compound knowledge
  craft: Skill, // Craft - creating/repairing objects, artisan work
  knowledge: Skill, // Knowledge - languages, ancient texts, ciphers, history, mythology
  medicine: Skill, // Medicine - wound treatment, poisoning, disease, anatomy

  // Mental Skills (Will)
  awareness: Skill, // Awareness - finding, hearing, observing
  survival: Skill, // Survival - hunting, navigation, camouflage
  occultism: Skill, // Occultism - controlling mysteries/rituals, supernatural artifacts

  // Social Skills (Charisma)
  performance: Skill, // Performance - acting, music, storytelling
  animalHandling: Skill // Animal Handling - animal training, mounted control
}) {}

/**
 * Calculate total skill bonus
 * Total = AttributeModifier + LevelBonus
 */
export function getSkillBonus(
  skill: Skill,
  attributeModifier: number
): number {
  return attributeModifier + skill.levelBonus
}

/**
 * Get level bonus based on proficiency and character level
 * Primary: +2→+3→+3→+4→+5→+5→+6→+7→+7→+8 (levels 1-10)
 * Secondary: +1→+1→+2→+2→+3→+3→+4→+4→+5→+5 (levels 1-10)
 */
export function calculateSkillLevelBonus(
  proficiency: SkillProficiency,
  characterLevel: number
): number {
  if (proficiency === "Untrained") return 0

  const progression = proficiency === "Primary"
    ? [2, 3, 3, 4, 5, 5, 6, 7, 7, 8] // Primary progression
    : [1, 1, 2, 2, 3, 3, 4, 4, 5, 5] // Secondary progression

  return progression[Math.min(characterLevel, 10) - 1] ?? 0
}
