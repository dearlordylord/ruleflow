/**
 * Concentration Events - Mystery concentration breaking
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Concentration broken (failed save, stunned, or voluntary)
 */
export class ConcentrationBroken extends Schema.TaggedClass<ConcentrationBroken>()(
  "ConcentrationBroken",
  {
    entityId: EntityId,
    reason: Schema.Literal("DamageFailed", "Stunned", "Voluntary"),
    damageTaken: Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    mysteryTriggered: Schema.Boolean // true if mystery already took effect on caster's turn
  }
) {}
