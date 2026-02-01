/**
 * Combat Maneuver Events - Disarm, Push, etc.
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Disarm attempt (contested Melee roll)
 */
export class DisarmAttempted extends Schema.TaggedClass<DisarmAttempted>()(
  "DisarmAttempted",
  {
    disarmerId: EntityId,
    targetId: EntityId,
    disarmerRoll: Schema.Int,
    targetRoll: Schema.Int,
    success: Schema.Boolean,
    itemDisarmed: Schema.NullOr(EntityId) // weapon/item that was disarmed
  }
) {}

/**
 * Push/shove attempt (contested Melee roll)
 * Can knock prone or push 5 feet away
 */
export class PushAttempted extends Schema.TaggedClass<PushAttempted>()(
  "PushAttempted",
  {
    pusherId: EntityId,
    targetId: EntityId,
    pusherRoll: Schema.Int,
    targetRoll: Schema.Int,
    success: Schema.Boolean,
    knockedProne: Schema.Boolean,
    distancePushed: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)) // feet
  }
) {}
