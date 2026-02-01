/**
 * Looting Components
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Corpse component - marks dead entity as lootable
 * Created when CharacterDied event occurs
 */
export class CorpseComponent extends Schema.TaggedClass<CorpseComponent>()(
  "Corpse",
  {
    // When character died
    deathTime: Schema.Number,

    // Who killed this entity
    killedBy: Schema.NullOr(EntityId),

    // Corpse decay (optional future mechanic)
    decayTimer: Schema.NullOr(Schema.Number)
  }
) {}

/**
 * Container component - chest, crate, treasure hoard
 */
export class ContainerComponent extends Schema.TaggedClass<ContainerComponent>()(
  "Container",
  {
    containerType: Schema.Literal("Chest", "Crate", "Sack", "Hoard", "Cache"),

    // Lock status: null = unknown, true = locked, false = unlocked
    isLocked: Schema.NullOr(Schema.Boolean),

    // Trap status: null = unknown, true = trapped, false = safe
    isTrapped: Schema.NullOr(Schema.Boolean),

    // Has container been searched (inventory revealed)?
    isSearched: Schema.Boolean,

    // Items not visible until searched
    // Moved to visible inventory after ContainerSearched
    hiddenItems: Schema.Array(EntityId)
  }
) {}

/**
 * Dropped item component - item on ground
 * Position tracking is TODO (room-based)
 */
export class DroppedItemComponent extends Schema.TaggedClass<DroppedItemComponent>()(
  "DroppedItem",
  {
    // Who dropped this item
    droppedBy: EntityId,

    // When it was dropped
    droppedAt: Schema.Number,

    // Why it was dropped (optional)
    reason: Schema.NullOr(Schema.String)
  }
) {}
