/**
 * Morale Check Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import type { MoraleResult } from "../npc/morale.js"

/**
 * Morale check performed (NPCs only)
 */
export class MoraleChecked extends Schema.TaggedClass<MoraleChecked>()(
  "MoraleChecked",
  {
    entityId: EntityId,
    roll: Schema.Int.pipe(Schema.between(2, 12)), // 2d6
    moraleValue: Schema.Int.pipe(Schema.between(-4, 4)),
    total: Schema.Int,
    result: Schema.Literal("Flight", "Retreat", "Defense", "Offense", "VictoryOrDeath")
  }
) {}
