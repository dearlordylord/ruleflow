/**
 * Skills System - All 15 OSR skills with progression
 */
import { Schema } from "effect"

import type { SetSkillsMutation } from "./mutations.js"

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

const DEFAULT_SKILL = Skill.make({
  proficiency: "Untrained",
  levelBonus: 0
})

const DEFAULT_SKILLS = {
  melee: DEFAULT_SKILL,
  might: DEFAULT_SKILL,
  accuracy: DEFAULT_SKILL,
  movement: DEFAULT_SKILL,
  sleightOfHand: DEFAULT_SKILL,
  stealth: DEFAULT_SKILL,
  alchemy: DEFAULT_SKILL,
  craft: DEFAULT_SKILL,
  knowledge: DEFAULT_SKILL,
  medicine: DEFAULT_SKILL,
  awareness: DEFAULT_SKILL,
  survival: DEFAULT_SKILL,
  occultism: DEFAULT_SKILL,
  performance: DEFAULT_SKILL,
  animalHandling: DEFAULT_SKILL
}

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
}) {
  static applyMutation(
    existing: SkillsComponent | null,
    mutation: SetSkillsMutation
  ): SkillsComponent {
    const base = existing ?? SkillsComponent.make(DEFAULT_SKILLS)
    return SkillsComponent.make({
      melee: mutation.data.melee ?? base.melee,
      might: mutation.data.might ?? base.might,
      accuracy: mutation.data.accuracy ?? base.accuracy,
      movement: mutation.data.movement ?? base.movement,
      sleightOfHand: mutation.data.sleightOfHand ?? base.sleightOfHand,
      stealth: mutation.data.stealth ?? base.stealth,
      alchemy: mutation.data.alchemy ?? base.alchemy,
      craft: mutation.data.craft ?? base.craft,
      knowledge: mutation.data.knowledge ?? base.knowledge,
      medicine: mutation.data.medicine ?? base.medicine,
      awareness: mutation.data.awareness ?? base.awareness,
      survival: mutation.data.survival ?? base.survival,
      occultism: mutation.data.occultism ?? base.occultism,
      performance: mutation.data.performance ?? base.performance,
      animalHandling: mutation.data.animalHandling ?? base.animalHandling
    })
  }
}

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
