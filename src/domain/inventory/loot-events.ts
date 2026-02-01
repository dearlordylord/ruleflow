/**
 * Looting Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * Item template reference (links to item tables)
 */
export const ItemTemplateId = Schema.String.pipe(Schema.brand("ItemTemplateId"))
export type ItemTemplateId = typeof ItemTemplateId.Type

/**
 * DOMAIN EVENT: DM announces item discovery
 *
 * This IS a domain event - represents DM saying "You discover a rope!" during gameplay.
 * The discovery itself is an observable in-game action with narrative significance.
 * NOT infrastructure setup - it's what happens when players search rooms, loot bodies, etc.
 *
 * Player action: "I search the room"
 * DM response: ItemDiscovered event → creates item entity
 */
export class ItemDiscovered extends Schema.TaggedClass<ItemDiscovered>()(
  "ItemDiscovered",
  {
    templateId: ItemTemplateId, // "Rope", "RustyShortSword", etc.
    quantity: Schema.Int.pipe(Schema.greaterThan(0)),
    discoveredAt: Schema.NullOr(EntityId) // container, corpse, room, null = spawned in hand
  }
) {}

/**
 * DOMAIN EVENT: DM announces container discovery
 *
 * This IS a domain event - represents DM saying "You find a locked chest!" during gameplay.
 * The discovery itself is an observable in-game action with narrative significance.
 * NOT infrastructure setup - it's what happens when players explore dungeons.
 *
 * Player action: "I explore the chamber"
 * DM response: ContainerDiscovered event → creates container entity
 */
export class ContainerDiscovered extends Schema.TaggedClass<ContainerDiscovered>()(
  "ContainerDiscovered",
  {
    containerType: Schema.Literal("Chest", "Crate", "Sack", "Hoard", "Cache"),
    isLocked: Schema.NullOr(Schema.Boolean), // null = unknown, true = locked, false = unlocked
    isTrapped: Schema.NullOr(Schema.Boolean), // null = unknown
    discoveredAt: Schema.NullOr(EntityId) // room, dungeon, etc.
  }
) {}

/**
 * Player loots item from source
 * Main action if from corpse/container, bonus action if from ground
 */
export class ItemLooted extends Schema.TaggedClass<ItemLooted>()(
  "ItemLooted",
  {
    looterId: EntityId,
    sourceId: EntityId, // corpse, container, ground item entity, or another character
    itemId: EntityId,
    quantity: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

/**
 * Player drops item
 * Creates ground item entity
 */
export class ItemDropped extends Schema.TaggedClass<ItemDropped>()(
  "ItemDropped",
  {
    dropperId: EntityId,
    itemId: EntityId,
    quantity: Schema.Int.pipe(Schema.greaterThan(0)),
    reason: Schema.NullOr(Schema.String) // "over-encumbered", "combat", etc.
  }
) {}

/**
 * Player searches container
 * Reveals contents (sets inventory from None to Some)
 * Main action
 */
export class ContainerSearched extends Schema.TaggedClass<ContainerSearched>()(
  "ContainerSearched",
  {
    searcherId: EntityId,
    containerId: EntityId
  }
) {}

/**
 * DM reveals container lock status
 * Business event triggered when player examines or tries to open
 */
export class ContainerLockDiscovered extends Schema.TaggedClass<ContainerLockDiscovered>()(
  "ContainerLockDiscovered",
  {
    containerId: EntityId,
    isLocked: Schema.Boolean
  }
) {}

/**
 * Bulk loot distribution
 * Typically out-of-combat, no action cost
 * Directly emits transfer mutations
 */
export class LootDistributed extends Schema.TaggedClass<LootDistributed>()(
  "LootDistributed",
  {
    distributorId: EntityId,
    distributions: Schema.Array(
      Schema.Struct({
        recipientId: EntityId,
        itemIds: Schema.Array(EntityId),
        copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
        silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
        gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
        platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
      })
    )
  }
) {}
