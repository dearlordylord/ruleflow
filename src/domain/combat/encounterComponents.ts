/**
 * Combat Encounter Components
 */
import { HashMap, Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Combat encounter state (singleton component on combat entity)
 * Tracks round, turn order, and current side
 */
export class CombatEncounterComponent extends Schema.TaggedClass<CombatEncounterComponent>()(
  "CombatEncounter",
  {
    encounterId: Schema.NonEmptyString,
    currentRound: Schema.Int.pipe(Schema.greaterThan(0)),
    currentSide: Schema.Literal("Players", "Enemies"),

    // Side-based initiative rolls (re-rolled each round)
    sidesInitiative: Schema.Struct({
      Players: Schema.Int.pipe(Schema.between(1, 6)),
      Enemies: Schema.Int.pipe(Schema.between(1, 6))
    }),

    // Participant lists
    playerEntities: Schema.Array(EntityId),
    enemyEntities: Schema.Array(EntityId),

    // Current turn order (within active side, sorted by dexterity)
    currentTurnOrder: Schema.Array(EntityId),
    currentTurnIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

    // Declaration phase complete flag
    declarationsComplete: Schema.Boolean
  }
) {}

/**
 * Distance tracking (abstract, from entity's POV)
 * Stores distances to other entities in feet
 */
export class DistanceComponent extends Schema.TaggedClass<DistanceComponent>()(
  "Distance",
  {
    distancesTo: Schema.HashMap({
      key: EntityId,
      value: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
    })
  }
) {}

/**
 * Ready action state
 */
export class ReadyActionComponent extends Schema.TaggedClass<ReadyActionComponent>()(
  "ReadyAction",
  {
    triggerCondition: Schema.NonEmptyString,
    actionType: Schema.Literal("Attack", "Movement", "Cast", "Interact"),
    targetId: Schema.NullOr(EntityId),
    triggered: Schema.Boolean
  }
) {}

/**
 * Defense stance (+2 AC until specified entity's turn)
 */
export class DefenseStanceComponent extends Schema.TaggedClass<DefenseStanceComponent>()(
  "DefenseStance",
  {
    active: Schema.Boolean,
    bonusAC: Schema.Int, // typically +2
    expiresOnTurnOf: EntityId // whose turn start ends this
  }
) {}

/**
 * Mystery casting state (declared before initiative)
 */
export class MysteryCastingComponent extends Schema.TaggedClass<MysteryCastingComponent>()(
  "MysteryCasting",
  {
    mysteryName: Schema.NonEmptyString,
    isMaintenanceOnly: Schema.Boolean, // maintaining concentration vs new cast
    declaredThisRound: Schema.Boolean,
    resolved: Schema.Boolean // mystery took effect on caster's turn
  }
) {}
