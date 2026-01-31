/**
 * Combat Conditions and Status Effects
 */
import { Schema } from "effect"

/**
 * Combat conditions that affect actions
 */
export const Condition = Schema.Literal(
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
  "Exhausted", // Fatigued from exertion
  "Frightened", // Scared, morale affected
  "Charmed", // Under magical influence
  "Invisible", // Cannot be seen normally
  "Hidden", // Concealed from view
  "Concentrating" // Maintaining a spell/mystery
)
export type Condition = typeof Condition.Type

/**
 * Component tracking active conditions
 */
export class ConditionsComponent extends Schema.TaggedClass<ConditionsComponent>()("Conditions", {
  activeConditions: Schema.Array(Condition),

  // Condition-specific data
  exhaustionLevel: Schema.Int.pipe(Schema.between(0, 6)), // 0 = none, 6 = death

  // Tracking concentration (for spell maintenance)
  concentratingOn: Schema.NullOr(Schema.NonEmptyString)
}) {}

/**
 * Grapple state - separate component for wrestling mechanics
 */
export class GrappleStateComponent extends Schema.TaggedClass<GrappleStateComponent>()("GrappleState", {
  // Who is grappling this entity
  grappledBy: Schema.NullOr(Schema.String), // EntityId

  // Who this entity is grappling
  grappling: Schema.Array(Schema.String), // EntityIds

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
