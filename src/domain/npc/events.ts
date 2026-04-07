/**
 * NPC Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

/**
 * DOMAIN EVENT: DM announces creature discovery
 *
 * This IS a domain event - represents DM saying "A goblin appears!" during gameplay.
 * The discovery itself is an observable in-game action with narrative significance.
 *
 * Monsters in this system are minimal - just a name for narrative purposes.
 * They have no stats, HP, or weapons. The DM declares damage directly.
 * Monsters only become mechanically interesting when looted.
 */
export class CreatureDiscovered extends Schema.TaggedClass<CreatureDiscovered>()(
  "CreatureDiscovered",
  {
    // Monster name for narrative
    name: Schema.NonEmptyString,
    // Where discovered (optional location reference)
    discoveredAt: Schema.NullOr(EntityId)
  }
) {}

/**
 * DOMAIN EVENT: Monster inflicts damage (DM-declared)
 *
 * The DM declares "the dragon bites you for 14 damage" - no attack roll from
 * the monster's perspective, no damage type usually needed.
 * The source is a monster name (string), not an entity with stats.
 */
export class MonsterDamageInflicted extends Schema.TaggedClass<MonsterDamageInflicted>()(
  "MonsterDamageInflicted",
  {
    // Who takes damage
    targetId: EntityId,
    // Damage amount (DM-declared)
    damageAmount: Schema.Int.pipe(Schema.greaterThan(0)),
    // Source description (monster name, trap, etc.)
    source: Schema.NonEmptyString
  }
) {}
