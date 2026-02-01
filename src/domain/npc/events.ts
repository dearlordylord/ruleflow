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
 * NOT infrastructure setup - it's what happens when players encounter enemies/NPCs.
 *
 * Player action: "I enter the cave"
 * DM response: CreatureDiscovered event -> creates creature entity with inline stats
 *
 * Uses inline stats since we don't have monster templates yet.
 */
export class CreatureDiscovered extends Schema.TaggedClass<CreatureDiscovered>()(
  "CreatureDiscovered",
  {
    // Creature stats inline
    name: Schema.NonEmptyString,
    // Attributes
    strength: Schema.Int.pipe(Schema.between(3, 18)),
    dexterity: Schema.Int.pipe(Schema.between(3, 18)),
    constitution: Schema.Int.pipe(Schema.between(3, 18)),
    intelligence: Schema.Int.pipe(Schema.between(3, 18)),
    will: Schema.Int.pipe(Schema.between(3, 18)),
    charisma: Schema.Int.pipe(Schema.between(3, 18)),
    // Health
    maxHP: Schema.Int.pipe(Schema.greaterThan(0)),
    currentHP: Schema.Int.pipe(Schema.greaterThan(0)),
    // Combat
    armorClass: Schema.Int.pipe(Schema.greaterThanOrEqualTo(10)),
    meleeAttackBonus: Schema.Int,
    rangedAttackBonus: Schema.Int,
    // Optional weapon info
    weaponName: Schema.NullOr(Schema.NonEmptyString),
    weaponDamageDice: Schema.NullOr(Schema.NonEmptyString), // e.g. "1d6"
    weaponGroup: Schema.NullOr(Schema.NonEmptyString),
    // Where discovered
    discoveredAt: Schema.NullOr(EntityId)
  }
) {}
