/**
 * Combat Encounter Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import type { MoraleResult } from "../npc/morale.js"

/**
 * Start a new combat round
 */
export class StartCombatRoundMutation extends Schema.TaggedClass<StartCombatRoundMutation>()(
  "StartCombatRound",
  {
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0)),
    activeSide: Schema.Literal("Players", "Enemies")
  }
) {}

/**
 * Advance to other side's turn
 */
export class AdvanceSideMutation extends Schema.TaggedClass<AdvanceSideMutation>()(
  "AdvanceSide",
  {
    newSide: Schema.Literal("Players", "Enemies")
  }
) {}

/**
 * Advance turn within current side
 */
export class AdvanceTurnMutation extends Schema.TaggedClass<AdvanceTurnMutation>()(
  "AdvanceTurn",
  {
    turnIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

/**
 * Reset entity's action economy at turn start
 */
export class ResetActionEconomyMutation extends Schema.TaggedClass<ResetActionEconomyMutation>()(
  "ResetActionEconomy",
  {
    entityId: EntityId
  }
) {}

/**
 * Set distance between two entities
 */
export class SetDistanceMutation extends Schema.TaggedClass<SetDistanceMutation>()(
  "SetDistance",
  {
    fromEntityId: EntityId,
    toEntityId: EntityId,
    distance: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)) // feet
  }
) {}

/**
 * Set ready action state
 */
export class SetReadyActionMutation extends Schema.TaggedClass<SetReadyActionMutation>()(
  "SetReadyAction",
  {
    entityId: EntityId,
    triggerCondition: Schema.NonEmptyString,
    actionType: Schema.Literal("Attack", "Movement", "Cast", "Interact"),
    targetId: Schema.NullOr(EntityId)
  }
) {}

/**
 * Clear ready action
 */
export class ClearReadyActionMutation extends Schema.TaggedClass<ClearReadyActionMutation>()(
  "ClearReadyAction",
  {
    entityId: EntityId
  }
) {}

/**
 * Set defense stance
 */
export class SetDefenseStanceMutation extends Schema.TaggedClass<SetDefenseStanceMutation>()(
  "SetDefenseStance",
  {
    entityId: EntityId,
    active: Schema.Boolean,
    bonusAC: Schema.Int,
    expiresOnTurnOf: Schema.NullOr(EntityId)
  }
) {}

/**
 * Set morale result (NPCs only)
 */
export class SetMoraleResultMutation extends Schema.TaggedClass<SetMoraleResultMutation>()(
  "SetMoraleResult",
  {
    entityId: EntityId,
    result: Schema.Literal("Flight", "Retreat", "Defense", "Offense", "VictoryOrDeath")
  }
) {}

/**
 * Set mystery casting state
 */
export class SetMysteryCastingMutation extends Schema.TaggedClass<SetMysteryCastingMutation>()(
  "SetMysteryCasting",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString,
    isMaintenanceOnly: Schema.Boolean,
    declaredThisRound: Schema.Boolean,
    resolved: Schema.Boolean
  }
) {}

/**
 * Clear mystery casting state
 */
export class ClearMysteryCastingMutation extends Schema.TaggedClass<ClearMysteryCastingMutation>()(
  "ClearMysteryCasting",
  {
    entityId: EntityId
  }
) {}
