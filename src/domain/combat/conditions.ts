/**
 * Combat Conditions and Status Effects
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Simple condition types (no additional data)
 */
export const SimpleConditionType = Schema.Literal(
  "Vulnerable", // Cannot defend effectively (e.g., surprised, concentrating on spell)
  "Prone", // On the ground, must use movement action to stand
  "Grappled", // Held by another creature
  "Restrained", // Tied up or otherwise fully immobilized
  "Blinded", // Cannot see
  "Deafened", // Cannot hear
  "Stunned", // Cannot act
  "Paralyzed", // Fully paralyzed
  "Unconscious", // Knocked out
  "Poisoned", // Suffering from poison
  "Diseased", // Suffering from disease
  "Frightened", // Scared, morale affected
  "Charmed", // Under magical influence
  "Invisible", // Cannot be seen normally
  "Hidden" // Concealed from view
)
export type SimpleConditionType = typeof SimpleConditionType.Type

/**
 * Conditions that carry their own data, making invalid states irrepresentable
 */
export const ConditionWithData = Schema.Union(
  Schema.Struct({ _type: Schema.Literal("Vulnerable") }),
  Schema.Struct({ _type: Schema.Literal("Prone") }),
  Schema.Struct({ _type: Schema.Literal("Grappled") }),
  Schema.Struct({ _type: Schema.Literal("Restrained") }),
  Schema.Struct({ _type: Schema.Literal("Blinded") }),
  Schema.Struct({ _type: Schema.Literal("Deafened") }),
  Schema.Struct({ _type: Schema.Literal("Stunned") }),
  Schema.Struct({ _type: Schema.Literal("Paralyzed") }),
  Schema.Struct({ _type: Schema.Literal("Unconscious") }),
  Schema.Struct({ _type: Schema.Literal("Poisoned") }),
  Schema.Struct({ _type: Schema.Literal("Diseased") }),
  Schema.Struct({ _type: Schema.Literal("Exhausted"), level: Schema.Int.pipe(Schema.between(1, 6)) }), // 1-6, 6 = death
  Schema.Struct({ _type: Schema.Literal("Frightened") }),
  Schema.Struct({ _type: Schema.Literal("Charmed") }),
  Schema.Struct({ _type: Schema.Literal("Invisible") }),
  Schema.Struct({ _type: Schema.Literal("Hidden") }),
  Schema.Struct({ _type: Schema.Literal("Concentrating"), mysteryName: Schema.NonEmptyString }) // Which mystery being maintained
)
export type ConditionWithData = typeof ConditionWithData.Type

/**
 * Helper to get condition type from ConditionWithData
 */
export type ConditionType = ConditionWithData["_type"]

/**
 * Helper to check if entity has a specific condition type
 */
export function hasCondition(conditions: ReadonlyArray<ConditionWithData>, type: ConditionType): boolean {
  return conditions.some(c => c._type === type)
}

/**
 * Helper to get a specific condition (useful for conditions with data)
 */
export function getCondition<T extends ConditionType>(
  conditions: ReadonlyArray<ConditionWithData>,
  type: T
): Extract<ConditionWithData, { _type: T }> | undefined {
  return conditions.find(c => c._type === type) as Extract<ConditionWithData, { _type: T }> | undefined
}

/**
 * Component tracking active conditions
 */
export class ConditionsComponent extends Schema.TaggedClass<ConditionsComponent>()("Conditions", {
  conditions: Schema.Array(ConditionWithData)
}) {}

/**
 * Grapple state - separate component for wrestling mechanics
 */
export class GrappleStateComponent extends Schema.TaggedClass<GrappleStateComponent>()("GrappleState", {
  // Who is grappling this entity
  grappledBy: Schema.NullOr(EntityId),

  // Who this entity is grappling
  grappling: Schema.Array(EntityId),

  // Pinned state (grappler succeeded in pinning)
  isPinned: Schema.Boolean,

  // Size advantage bonus (+4 if significantly larger)
  sizeAdvantageBonus: Schema.Int
}) {}

/**
 * Initiative tracking for combat rounds
 */
export class InitiativeComponent extends Schema.TaggedClass<InitiativeComponent>()("Initiative", {
  // Initiative roll result
  roll: Schema.Int.pipe(Schema.between(1, 6)),

  // Modifier (from Combat Reflexes, dexterity, etc.)
  modifier: Schema.Int,

  // Total initiative (roll + modifier)
  total: Schema.Int,

  // Can voluntarily shift initiative down
  delayedUntil: Schema.NullOr(Schema.Int),

  // Has acted this round
  hasActed: Schema.Boolean
}) {}

/**
 * Action economy tracking
 */
export class ActionEconomyComponent extends Schema.TaggedClass<ActionEconomyComponent>()("ActionEconomy", {
  // Standard actions available (normally 1 main + 1 move per round)
  mainActionsAvailable: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  movementActionsAvailable: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  bonusActionsAvailable: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Full action taken (replaces main + movement)
  fullActionTaken: Schema.Boolean,

  // Ready action state
  readyActionCondition: Schema.NullOr(Schema.NonEmptyString),
  readyActionType: Schema.NullOr(Schema.NonEmptyString)
}) {}
