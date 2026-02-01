/**
 * Consumable Items - Potions, Poisons, Alchemicals
 */
import { Schema } from "effect"

/**
 * Consumable types
 */
export const ConsumableType = Schema.Literal(
  "Potion",
  "Poison",
  "AlchemicalFire",
  "SmokeGrenade",
  "PowderGrenade",
  "Antidote",
  "Medicine",
  "RepairKit",
  "HealingKit"
)
export type ConsumableType = typeof ConsumableType.Type

export class ConsumableComponent extends Schema.TaggedClass<ConsumableComponent>()("Consumable", {
  consumableType: ConsumableType,

  // Number of uses (e.g., healing kit has 10 uses)
  usesRemaining: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  maxUses: Schema.Int.pipe(Schema.greaterThan(0)),

  // Durability pool for repair kits (total durability points that can be restored)
  // Rulebook: Repair kits can restore 10 total durability points across multiple items
  // This field decrements as items are repaired
  durabilityPool: Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),

  // Effect description
  effect: Schema.NonEmptyString,

  // Save DC for poisons/harmful effects
  saveDC: Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(10))),

  // Damage/healing dice
  effectDice: Schema.NullOr(Schema.String) // e.g., "1d6", "2d8"
}) {}

/**
 * Poison definitions from rulebook
 */
export const POISON_DEFINITIONS = {
  "White Arsenic": {
    consumableType: "Poison" as ConsumableType,
    effect: "Causes nausea and weakness",
    saveDC: 15,
    effectDice: "1d6"
  },
  "Wolfsbane Death": {
    consumableType: "Poison" as ConsumableType,
    effect: "Lethal poison affecting heart",
    saveDC: 18,
    effectDice: "2d8"
  },
  Cantarella: {
    consumableType: "Poison" as ConsumableType,
    effect: "Slow-acting poison",
    saveDC: 16,
    effectDice: "1d8"
  },
  "Salt of the Hanged": {
    consumableType: "Poison" as ConsumableType,
    effect: "Paralytic poison",
    saveDC: 17,
    effectDice: "1d10"
  }
} as const

/**
 * Alchemical item definitions
 */
export const ALCHEMICAL_DEFINITIONS = {
  "Alchemical Fire": {
    consumableType: "AlchemicalFire" as ConsumableType,
    effect: "1d6 damage per round for 1d4+1 rounds",
    effectDice: "1d6"
  },
  "Smoke Pellet": {
    consumableType: "SmokeGrenade" as ConsumableType,
    effect: "10' vision obstruction for 1d4+1 rounds",
    effectDice: null
  },
  "Powder Grenade": {
    consumableType: "PowderGrenade" as ConsumableType,
    effect: "1d10 damage, 5' radius, DC 15 save for half",
    saveDC: 15,
    effectDice: "1d10"
  }
} as const

/**
 * Kit definitions from rulebook
 */
export const KIT_DEFINITIONS = {
  "Repair Kit": {
    consumableType: "RepairKit" as ConsumableType,
    effect: "Repairs equipment durability",
    usesRemaining: 10,
    maxUses: 10,
    durabilityPool: 10, // Can repair 10 total durability points
    effectDice: null
  },
  "Healing Kit": {
    consumableType: "HealingKit" as ConsumableType,
    effect: "Medical aid for wounds and poison, or 10 days of care",
    usesRemaining: 10,
    maxUses: 10,
    durabilityPool: null, // Not for repairs
    effectDice: null
  }
} as const
