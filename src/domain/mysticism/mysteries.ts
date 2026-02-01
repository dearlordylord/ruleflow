/**
 * Mysteries/Spells - Mystic class abilities
 */
import { Schema } from "effect"

type SaveType = "Restraint" | "Exhaustion" | "Dodge" | "Suppression" | "Confusion" | "Curse"

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
 * Mystery Spheres - Five categories based on rulebook
 * Immanence: Mind/perception (14 mysteries)
 * Kinetics: Forces/elements (15 mysteries)
 * Creation: Matter/transformation (14 mysteries)
 * Metacontinuum: Time/space (15 mysteries)
 * Physio-Essence: Life/body (15 mysteries)
 */
export const MysterySphere = Schema.Literal(
  "Immanence",
  "Kinetics",
  "Creation",
  "Metacontinuum",
  "PhysioEssence"
)
export type MysterySphere = typeof MysterySphere.Type

/**
 * Augmentation option for scaling mysteries
 */
export class AugmentationOption extends Schema.Class<AugmentationOption>("AugmentationOption")({
  costInCP: Schema.Int.pipe(Schema.greaterThan(0)),
  effect: Schema.NonEmptyString,
  maxLevel: Schema.NullOr(Schema.Int)
}) {}

/**
 * Individual mystery definition
 */
export class Mystery extends Schema.Class<Mystery>("Mystery")({
  name: Schema.NonEmptyString,
  tier: MysteryTier,
  sphere: MysterySphere,

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
  saveType: Schema.NullOr(Schema.Literal(
    "Restraint",
    "Exhaustion",
    "Dodge",
    "Suppression",
    "Confusion",
    "Curse"
  )),

  // Damage/healing dice (if applicable)
  effectDice: Schema.NullOr(Schema.String),

  // Augmentation options
  augmentationOptions: Schema.Array(AugmentationOption)
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
 * Concentration cost by tier
 */
export const CONCENTRATION_COST_BY_TIER: Record<MysteryTier, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 7,
  5: 9
}

/**
 * All 66 mystery definitions from rulebook
 * Organized by sphere and tier
 */
type MysteryData = {
  name: string
  tier: MysteryTier
  sphere: MysterySphere
  concentrationCost: number
  requiresConcentration: boolean
  effect: string
  durationDescription: string | null
  rangeInFeet: number
  areaOfEffectDescription: string | null
  saveType: SaveType | null
  effectDice: string | null
  augmentationOptions: Array<{
    costInCP: number
    effect: string
    maxLevel: number | null
  }>
}

export const MYSTERY_DEFINITIONS: Record<string, MysteryData> = {
  // ===== IMMANENCE (14 mysteries) =====

  // Tier 1
  "Message": {
    name: "Message",
    tier: 1,
    sphere: "Immanence",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Send mental message to target",
    durationDescription: "Instantaneous",
    rangeInFeet: 120,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Sensory Link": {
    name: "Sensory Link",
    tier: 1,
    sphere: "Immanence",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Perceive through another creature's senses",
    durationDescription: "Concentration",
    rangeInFeet: 300,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Fascination": {
    name: "Fascination",
    tier: 1,
    sphere: "Immanence",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Improve target's disposition toward you",
    durationDescription: "1 hour",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Sense Anomalies": {
    name: "Sense Anomalies",
    tier: 1,
    sphere: "Immanence",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Detect supernatural manifestations",
    durationDescription: "Concentration, up to 10 minutes",
    rangeInFeet: 60,
    areaOfEffectDescription: "30' radius",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 2
  "Inner Sight": {
    name: "Inner Sight",
    tier: 2,
    sphere: "Immanence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Sense surroundings in radius without sight",
    durationDescription: "Concentration",
    rangeInFeet: 0,
    areaOfEffectDescription: "30' radius around caster",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Mind Deception": {
    name: "Mind Deception",
    tier: 2,
    sphere: "Immanence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Things appear different than reality to target",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Confusion",
    effectDice: null,
    augmentationOptions: []
  },

  "Understand Speech": {
    name: "Understand Speech",
    tier: 2,
    sphere: "Immanence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Understand any spoken/written language",
    durationDescription: "Concentration, up to 1 hour",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Extrasensory Perception": {
    name: "Extrasensory Perception",
    tier: 2,
    sphere: "Immanence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Read surface emotions/thoughts of nearby creatures",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "30' radius",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 3
  "Confusion": {
    name: "Confusion",
    tier: 3,
    sphere: "Immanence",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Target acts confused and erratically",
    durationDescription: "1 minute",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Confusion",
    effectDice: null,
    augmentationOptions: []
  },

  "Memory Alteration": {
    name: "Memory Alteration",
    tier: 3,
    sphere: "Immanence",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Replace or erase recent memories of target",
    durationDescription: "Permanent",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Mental Presence": {
    name: "Mental Presence",
    tier: 3,
    sphere: "Immanence",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "See distant objects as if present",
    durationDescription: "Concentration",
    rangeInFeet: 600,
    areaOfEffectDescription: "Observed location",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 4
  "Domination": {
    name: "Domination",
    tier: 4,
    sphere: "Immanence",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Complete control over target's actions",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Contact with Great Ones": {
    name: "Contact with Great Ones",
    tier: 4,
    sphere: "Immanence",
    concentrationCost: 7,
    requiresConcentration: false,
    effect: "Ask question to transcendent extraterrestrial entities",
    durationDescription: "Instantaneous",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 5
  "Radiaesthesia": {
    name: "Radiaesthesia",
    tier: 5,
    sphere: "Immanence",
    concentrationCost: 9,
    requiresConcentration: false,
    effect: "Obtain detailed information about target",
    durationDescription: "Instantaneous",
    rangeInFeet: 1200,
    areaOfEffectDescription: "1 target",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // ===== KINETICS (15 mysteries) =====

  // Tier 1
  "Matter Excitement": {
    name: "Matter Excitement",
    tier: 1,
    sphere: "Kinetics",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Heat object or creature",
    durationDescription: "Instantaneous",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 target",
    saveType: "Dodge",
    effectDice: "1d6",
    augmentationOptions: []
  },

  "Sound Control": {
    name: "Sound Control",
    tier: 1,
    sphere: "Kinetics",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Create sound source or silence area",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "15' radius",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Pyrokinesis": {
    name: "Pyrokinesis",
    tier: 1,
    sphere: "Kinetics",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Launch bolt of fire",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 target",
    saveType: "Dodge",
    effectDice: "1d6",
    augmentationOptions: []
  },

  "Telekinesis": {
    name: "Telekinesis",
    tier: 1,
    sphere: "Kinetics",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Manipulate objects at distance",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 object up to 10 lbs",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 2
  "Air Sphere": {
    name: "Air Sphere",
    tier: 2,
    sphere: "Kinetics",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Create sphere of breathable air",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "10' radius sphere",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Inertial Barrier": {
    name: "Inertial Barrier",
    tier: 2,
    sphere: "Kinetics",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Create protective force barrier",
    durationDescription: "Concentration",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self or touched creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Gust of Wind": {
    name: "Gust of Wind",
    tier: 2,
    sphere: "Kinetics",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Create powerful wind gust",
    durationDescription: "1 round",
    rangeInFeet: 60,
    areaOfEffectDescription: "Line 10' wide, 60' long",
    saveType: "Restraint",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 3
  "Discharge": {
    name: "Discharge",
    tier: 3,
    sphere: "Kinetics",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Electric discharge damaging target",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 target",
    saveType: "Dodge",
    effectDice: "3d6",
    augmentationOptions: []
  },

  "Force Wall": {
    name: "Force Wall",
    tier: 3,
    sphere: "Kinetics",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "Create wall of force",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "20' long, 10' high wall",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Binding": {
    name: "Binding",
    tier: 3,
    sphere: "Kinetics",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "Immobilize target with force bonds",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Restraint",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 4
  "Meteokinesis": {
    name: "Meteokinesis",
    tier: 4,
    sphere: "Kinetics",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Control local weather",
    durationDescription: "Concentration, up to 1 hour",
    rangeInFeet: 0,
    areaOfEffectDescription: "300' radius",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Gravity Reversal": {
    name: "Gravity Reversal",
    tier: 4,
    sphere: "Kinetics",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Reverse gravity in area",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "30' radius",
    saveType: "Restraint",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 5
  "Earthquake": {
    name: "Earthquake",
    tier: 5,
    sphere: "Kinetics",
    concentrationCost: 9,
    requiresConcentration: true,
    effect: "Cause violent tremors",
    durationDescription: "Concentration, up to 1 minute",
    rangeInFeet: 300,
    areaOfEffectDescription: "60' radius",
    saveType: "Dodge",
    effectDice: "3d10",
    augmentationOptions: []
  },

  // ===== CREATION (14 mysteries) =====

  // Tier 1
  "Dissociation": {
    name: "Dissociation",
    tier: 1,
    sphere: "Creation",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Destroy small inanimate object",
    durationDescription: "Instantaneous",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 object up to 1 cubic foot",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Luminescence": {
    name: "Luminescence",
    tier: 1,
    sphere: "Creation",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Create light source",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "30' radius bright light",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Reconstruction": {
    name: "Reconstruction",
    tier: 1,
    sphere: "Creation",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Repair damaged object",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 object",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 2
  "Fog": {
    name: "Fog",
    tier: 2,
    sphere: "Creation",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Create obscuring fog",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "20' radius",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Size Alteration": {
    name: "Size Alteration",
    tier: 2,
    sphere: "Creation",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Change size of creature/object",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 target",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Friction": {
    name: "Friction",
    tier: 2,
    sphere: "Creation",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Alter friction on surface",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "20' square",
    saveType: "Dodge",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 3
  "Invisibility": {
    name: "Invisibility",
    tier: 3,
    sphere: "Creation",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "Make target invisible",
    durationDescription: "Concentration",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature or object",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Reaggregation": {
    name: "Reaggregation",
    tier: 3,
    sphere: "Creation",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Restore destroyed object",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 object",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Fabrication": {
    name: "Fabrication",
    tier: 3,
    sphere: "Creation",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Create object from raw materials",
    durationDescription: "Instantaneous",
    rangeInFeet: 30,
    areaOfEffectDescription: "Created object",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 4
  "Antimatter": {
    name: "Antimatter",
    tier: 4,
    sphere: "Creation",
    concentrationCost: 7,
    requiresConcentration: false,
    effect: "Destroy matter in area",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "20' radius sphere",
    saveType: "Dodge",
    effectDice: "4d8",
    augmentationOptions: []
  },

  "Disintegration": {
    name: "Disintegration",
    tier: 4,
    sphere: "Creation",
    concentrationCost: 7,
    requiresConcentration: false,
    effect: "Destroy target creature/object",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 target",
    saveType: "Exhaustion",
    effectDice: "6d6",
    augmentationOptions: []
  },

  // Tier 5
  "Transmutation": {
    name: "Transmutation",
    tier: 5,
    sphere: "Creation",
    concentrationCost: 9,
    requiresConcentration: false,
    effect: "Transform one substance into another",
    durationDescription: "Permanent",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 object up to 10 cubic feet",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // ===== METACONTINUUM (15 mysteries) =====

  // Tier 1
  "False Aura": {
    name: "False Aura",
    tier: 1,
    sphere: "Metacontinuum",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Mask magical aura of object/creature",
    durationDescription: "1 hour",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 target",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Summoning": {
    name: "Summoning",
    tier: 1,
    sphere: "Metacontinuum",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Summon extradimensional creature",
    durationDescription: "1 hour",
    rangeInFeet: 30,
    areaOfEffectDescription: "Summoned creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Sanctuary": {
    name: "Sanctuary",
    tier: 1,
    sphere: "Metacontinuum",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Protect target from attacks",
    durationDescription: "Concentration",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 2
  "Disjunction": {
    name: "Disjunction",
    tier: 2,
    sphere: "Metacontinuum",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Dispel ongoing mystery effect",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 effect",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Flickering": {
    name: "Flickering",
    tier: 2,
    sphere: "Metacontinuum",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Phase in/out of reality for defense",
    durationDescription: "Concentration",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Teleportation": {
    name: "Teleportation",
    tier: 2,
    sphere: "Metacontinuum",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Instantly transport to visible location",
    durationDescription: "Instantaneous",
    rangeInFeet: 300,
    areaOfEffectDescription: "Self + carried items",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Chronoporting": {
    name: "Chronoporting",
    tier: 2,
    sphere: "Metacontinuum",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Send object/message to past/future",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 object up to 1 lb",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 3
  "Slow/Haste": {
    name: "Slow/Haste",
    tier: 3,
    sphere: "Metacontinuum",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "Slow or hasten target's time flow",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Banishment": {
    name: "Banishment",
    tier: 3,
    sphere: "Metacontinuum",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Send creature to home dimension",
    durationDescription: "Permanent",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Dimensional Anchor": {
    name: "Dimensional Anchor",
    tier: 3,
    sphere: "Metacontinuum",
    concentrationCost: 5,
    requiresConcentration: true,
    effect: "Prevent dimensional travel",
    durationDescription: "Concentration",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 4
  "Gates": {
    name: "Gates",
    tier: 4,
    sphere: "Metacontinuum",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Create portal to another location/dimension",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "Portal 10' diameter",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Zone of Permanence": {
    name: "Zone of Permanence",
    tier: 4,
    sphere: "Metacontinuum",
    concentrationCost: 7,
    requiresConcentration: false,
    effect: "Make mystery effect permanent in area",
    durationDescription: "Permanent",
    rangeInFeet: 30,
    areaOfEffectDescription: "10' radius",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 5
  "Time Stop": {
    name: "Time Stop",
    tier: 5,
    sphere: "Metacontinuum",
    concentrationCost: 9,
    requiresConcentration: false,
    effect: "Stop time for all but caster",
    durationDescription: "1d4+1 rounds",
    rangeInFeet: 0,
    areaOfEffectDescription: "Caster only",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // ===== PHYSIO-ESSENCE (15 mysteries) =====

  // Tier 1
  "Restoration": {
    name: "Restoration",
    tier: 1,
    sphere: "PhysioEssence",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Heal creature's wounds",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: "1d8",
    augmentationOptions: []
  },

  "Pseudo-life": {
    name: "Pseudo-life",
    tier: 1,
    sphere: "PhysioEssence",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Temporarily increase target's vitality",
    durationDescription: "1 hour",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: "1d8",
    augmentationOptions: []
  },

  "Reanimation": {
    name: "Reanimation",
    tier: 1,
    sphere: "PhysioEssence",
    concentrationCost: 1,
    requiresConcentration: false,
    effect: "Temporarily restore functionality to dead body",
    durationDescription: "1 hour",
    rangeInFeet: 10,
    areaOfEffectDescription: "1 corpse",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Synesthesia": {
    name: "Synesthesia",
    tier: 1,
    sphere: "PhysioEssence",
    concentrationCost: 1,
    requiresConcentration: true,
    effect: "Perceive surroundings through alternate senses",
    durationDescription: "Concentration",
    rangeInFeet: 0,
    areaOfEffectDescription: "Self",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 2

  "Adaptation": {
    name: "Adaptation",
    tier: 2,
    sphere: "PhysioEssence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Adapt to hostile environment",
    durationDescription: "Concentration",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Polymorphism": {
    name: "Polymorphism",
    tier: 2,
    sphere: "PhysioEssence",
    concentrationCost: 3,
    requiresConcentration: true,
    effect: "Transform creature into beast form",
    durationDescription: "Concentration",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Suppression",
    effectDice: null,
    augmentationOptions: []
  },

  "Rehabilitation": {
    name: "Rehabilitation",
    tier: 2,
    sphere: "PhysioEssence",
    concentrationCost: 3,
    requiresConcentration: false,
    effect: "Cure disease or remove poison",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 3
  "Infection": {
    name: "Infection",
    tier: 3,
    sphere: "PhysioEssence",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Inflict disease on target",
    durationDescription: "Until cured",
    rangeInFeet: 30,
    areaOfEffectDescription: "1 creature",
    saveType: "Exhaustion",
    effectDice: "2d6",
    augmentationOptions: []
  },

  "Comatose": {
    name: "Comatose",
    tier: 3,
    sphere: "PhysioEssence",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Put target into deep sleep/coma",
    durationDescription: "1 hour or until damaged",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Exhaustion",
    effectDice: null,
    augmentationOptions: []
  },

  "Cleansing": {
    name: "Cleansing",
    tier: 3,
    sphere: "PhysioEssence",
    concentrationCost: 5,
    requiresConcentration: false,
    effect: "Remove poisons and diseases from organism",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  // Tier 4
  "Self-Sufficiency": {
    name: "Self-Sufficiency",
    tier: 4,
    sphere: "PhysioEssence",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Eliminate need for food/water/air/sleep",
    durationDescription: "Concentration, up to 1 day",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  },

  "Cardiac Arrest": {
    name: "Cardiac Arrest",
    tier: 4,
    sphere: "PhysioEssence",
    concentrationCost: 7,
    requiresConcentration: false,
    effect: "Stop target's heart",
    durationDescription: "Instantaneous",
    rangeInFeet: 60,
    areaOfEffectDescription: "1 creature",
    saveType: "Exhaustion",
    effectDice: "6d8",
    augmentationOptions: []
  },

  "Regeneration": {
    name: "Regeneration",
    tier: 4,
    sphere: "PhysioEssence",
    concentrationCost: 7,
    requiresConcentration: true,
    effect: "Grant rapid healing and regrow limbs",
    durationDescription: "Concentration, up to 1 hour",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 creature",
    saveType: null,
    effectDice: "2d8",
    augmentationOptions: []
  },

  // Tier 5
  "Resurrection": {
    name: "Resurrection",
    tier: 5,
    sphere: "PhysioEssence",
    concentrationCost: 9,
    requiresConcentration: false,
    effect: "Return dead to life",
    durationDescription: "Instantaneous",
    rangeInFeet: 5,
    areaOfEffectDescription: "1 corpse",
    saveType: null,
    effectDice: null,
    augmentationOptions: []
  }
}

/**
 * Get mysteries by sphere
 */
export function getMysteryBySphere(sphere: MysterySphere, tier?: MysteryTier): MysteryData[] {
  return Object.values(MYSTERY_DEFINITIONS)
    .filter(m => m.sphere === sphere && (tier === undefined || m.tier === tier))
}

/**
 * Get mystery by name
 */
export function getMysteryByName(name: string): MysteryData | undefined {
  return MYSTERY_DEFINITIONS[name]
}
