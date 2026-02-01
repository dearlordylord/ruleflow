/**
 * Combat Encounter Events - Round and turn management
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Combat round started
 * Initiative is re-rolled each round!
 */
export class CombatRoundStarted extends Schema.TaggedClass<CombatRoundStarted>()(
  "CombatRoundStarted",
  {
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0)),
    activeSide: Schema.Literal("Players", "Enemies")
  }
) {}

/**
 * Combat round ended
 */
export class CombatRoundEnded extends Schema.TaggedClass<CombatRoundEnded>()(
  "CombatRoundEnded",
  {
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

/**
 * Entity's turn started
 */
export class TurnStarted extends Schema.TaggedClass<TurnStarted>()(
  "TurnStarted",
  {
    entityId: EntityId,
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

/**
 * Entity's turn ended
 */
export class TurnEnded extends Schema.TaggedClass<TurnEnded>()(
  "TurnEnded",
  {
    entityId: EntityId,
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

/**
 * Mystery casting declared (before initiative roll)
 */
export class MysteryCastDeclared extends Schema.TaggedClass<MysteryCastDeclared>()(
  "MysteryCastDeclared",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString,
    isMaintenanceOnly: Schema.Boolean // just maintaining concentration vs new cast
  }
) {}

/**
 * Withdrawal declared (before initiative roll)
 * Allows ½ speed movement without being vulnerable
 */
export class WithdrawalDeclared extends Schema.TaggedClass<WithdrawalDeclared>()(
  "WithdrawalDeclared",
  {
    entityId: EntityId
  }
) {}

/**
 * Retreat declared (before initiative roll)
 * Allows full/triple speed movement but entity is vulnerable until turn starts
 */
export class RetreatDeclared extends Schema.TaggedClass<RetreatDeclared>()(
  "RetreatDeclared",
  {
    entityId: EntityId,
    willRun: Schema.Boolean // if true, uses triple speed (full action)
  }
) {}

/**
 * Movement performed during turn
 */
export class MovementPerformed extends Schema.TaggedClass<MovementPerformed>()(
  "MovementPerformed",
  {
    entityId: EntityId,
    distanceMoved: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)), // feet
    isWithdrawal: Schema.Boolean,
    isRetreat: Schema.Boolean
  }
) {}

/**
 * Defense stance taken (+2 AC until next turn)
 */
export class DefenseStanceTaken extends Schema.TaggedClass<DefenseStanceTaken>()(
  "DefenseStanceTaken",
  {
    entityId: EntityId
  }
) {}

/**
 * Ready action declared (delay action until trigger condition)
 */
export class ReadyActionDeclared extends Schema.TaggedClass<ReadyActionDeclared>()(
  "ReadyActionDeclared",
  {
    entityId: EntityId,
    triggerCondition: Schema.NonEmptyString,
    actionType: Schema.Literal("Attack", "Movement", "Cast", "Interact"),
    targetId: Schema.NullOr(EntityId)
  }
) {}

/**
 * Ready action trigger condition met
 */
export class ReadyActionTriggered extends Schema.TaggedClass<ReadyActionTriggered>()(
  "ReadyActionTriggered",
  {
    entityId: EntityId
  }
) {}
