/**
 * Mystery Casting Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Mystery resolved on caster's turn
 * Effects take place when caster acts (not when declared)
 */
export class MysteryResolved extends Schema.TaggedClass<MysteryResolved>()(
  "MysteryResolved",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString,
    targets: Schema.Array(EntityId) // explicit target list
    // TODO: mystery-specific effect data when full mystery system implemented
  }
) {}
