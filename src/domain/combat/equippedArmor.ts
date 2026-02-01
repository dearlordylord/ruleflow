/**
 * Equipped Armor Component
 * Tracks what armor and shield an entity currently has equipped
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

export class EquippedArmorComponent extends Schema.TaggedClass<EquippedArmorComponent>()("EquippedArmor", {
  armorId: Schema.NullOr(EntityId),
  shieldId: Schema.NullOr(EntityId)
}) {}
