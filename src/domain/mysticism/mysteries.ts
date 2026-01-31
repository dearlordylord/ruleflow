/**
 * Mysteries/Spells - Mystic class abilities
 */
import { Schema } from "effect"

/**
 * Mystery tiers (levels 1-5)
 * Mystic learns mysteries based on level:
 * - Level 1-2: Tier 1 mysteries
 * - Level 3-4: Tier 2 mysteries
 * - Level 5-6: Tier 3 mysteries
 * - Level 7-8: Tier 4 mysteries
 * - Level 9-10: Tier 5 mysteries
 */
export const MysteryTier = Schema.Literal(1, 2, 3, 4, 5)
export type MysteryTier = typeof MysteryTier.Type

/**
 * Mystery categories/schools
 */
export const MysterySchool = Schema.Literal(
  "Fire",
  "Mind Obfuscation",
  "Summoning",
  "Reanimation",
  "Telekinesis",
  "Transformation",
  "Sensory",
  "Divination",
  "Healing",
  "Protection",
  "Curse",
  "Illusion"
)
export type MysterySchool = typeof MysterySchool.Type

/**
 * Individual mystery definition
 */
export class Mystery extends Schema.Class<Mystery>("Mystery")({
  name: Schema.NonEmptyString,
  tier: MysteryTier,
  school: MysterySchool,

  // Concentration cost to cast
  concentrationCost: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Whether it requires ongoing concentration
  requiresConcentration: Schema.Boolean,

  // Effect description
  effect: Schema.NonEmptyString,

  // Duration (null if instantaneous)
  durationDescription: Schema.NullOr(Schema.NonEmptyString),

  // Range
  rangeInFeet: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Area of effect
  areaOfEffectDescription: Schema.NullOr(Schema.NonEmptyString),

  // Save DC formula (if applicable)
  saveType: Schema.NullOr(Schema.Literal("Restraint", "Exhaustion", "Dodge", "Suppression", "Confusion", "Curse")),

  // Damage/healing dice (if applicable)
  effectDice: Schema.NullOr(Schema.String)
}) {}

/**
 * Known mysteries component
 */
export class KnownMysteriesComponent extends Schema.TaggedClass<KnownMysteriesComponent>()("KnownMysteries", {
  // Mysteries known by this mystic
  knownMysteries: Schema.Array(Schema.NonEmptyString), // Mystery names

  // Maximum tier can learn based on level
  maxTierAvailable: MysteryTier
}) {}

/**
 * Sample mystery definitions from rulebook references
 */
export const MYSTERY_DEFINITIONS: Record<string, Omit<Mystery, typeof Schema.Class.symbol>> = {
  // FIRE SCHOOL
  "Flame Bolt": {
    name: "Flame Bolt",
    tier: 1,
    school: "Fire",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Launch a bolt of fire at a target",
    durationDescription: null,
    rangeInFeet: 60,
    areaOfEffectDescription: null,
    saveType: "Dodge",
    effectDice: "1d6"
  },

  "Wall of Fire": {
    name: "Wall of Fire",
    tier: 3,
    school: "Fire",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Create a wall of flames",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "20' long, 10' high wall",
    saveType: "Dodge",
    effectDice: "2d6"
  },

  // MIND OBFUSCATION
  "Charm Person": {
    name: "Charm Person",
    tier: 1,
    school: "Mind Obfuscation",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Make a person friendly to you",
    durationDescription: "1 hour",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null
  },

  "Nightmare Imagery": {
    name: "Nightmare Imagery",
    tier: 2,
    school: "Mind Obfuscation",
    concentrationCost: 2,
    requiresConcentration: false,
    effect: "Inflict nightmarish visions",
    durationDescription: null,
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Confusion",
    effectDice: "1d8"
  },

  // SUMMONING
  "Summon Minor Creature": {
    name: "Summon Minor Creature",
    tier: 1,
    school: "Summoning",
    concentrationCost: 2,
    requiresConcentration: true,
    effect: "Summon a small creature to aid you",
    durationDescription: "Concentration, up to 1 hour",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 summoned creature",
    saveType: null,
    effectDice: null
  },

  // REANIMATION
  "Animate Dead": {
    name: "Animate Dead",
    tier: 2,
    school: "Reanimation",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Animate a corpse as undead servant",
    durationDescription: "Permanent until destroyed",
    rangeInFeet: 10,
    areaOfEffectDescription: "1 corpse",
    saveType: null,
    effectDice: null
  },

  // TELEKINESIS
  "Mage Hand": {
    name: "Mage Hand",
    tier: 1,
    school: "Telekinesis",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Manipulate objects at a distance",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 object up to 10 lbs",
    saveType: null,
    effectDice: null
  },

  // TRANSFORMATION
  "Polymorph": {
    name: "Polymorph",
    tier: 4,
    school: "Transformation",
    concentrationCost: 4,
    requiresConcentration: true,
    effect: "Transform a creature into another form",
    durationDescription: "Concentration, up to 1 hour",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null
  },

  // SENSORY
  "Detect Magic": {
    name: "Detect Magic",
    tier: 1,
    school: "Sensory",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Sense magical auras within range",
    durationDescription: "Concentration, up to 10 minutes",
    rangeInFeet: 60,
    areaOfEffectDescription: "30' radius",
    saveType: null,
    effectDice: null
  },

  // HEALING
  "Cure Wounds": {
    name: "Cure Wounds",
    tier: 1,
    school: "Healing",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Heal a creature's wounds",
    durationDescription: null,
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: "1d8"
  },

  // PROTECTION
  "Shield": {
    name: "Shield",
    tier: 1,
    school: "Protection",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "+2 AC until your next turn",
    durationDescription: "1 round",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self",
    saveType: null,
    effectDice: null
  }
}
