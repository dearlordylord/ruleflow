/**
 * Monster Damage System
 * Processes MonsterDamageInflicted events (DM-declared damage) into DealDamageMutation
 */
import { Chunk, Effect } from "effect"

import { EntityId } from "../entities.js"
import { DealDamageMutation } from "../mutations.js"
import type { MonsterDamageInflicted } from "../npc/events.js"
import type { System } from "./types.js"

/**
 * Converts MonsterDamageInflicted events into DealDamageMutation
 * The traumaSystem then handles the actual HP reduction.
 *
 * Uses a synthetic "monster" EntityId since monsters don't have real entity IDs
 * in this system - they're just narrative descriptions.
 */
export const monsterDamageSystem: System = (_state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const damageEvents = Chunk.filter(
      events,
      (event): event is MonsterDamageInflicted => event._tag === "MonsterDamageInflicted"
    )

    const mutations = Chunk.map(damageEvents, (event) =>
      DealDamageMutation.make({
        entityId: event.targetId,
        amount: event.damageAmount,
        // Use a synthetic ID since monsters don't have real entity IDs
        source: EntityId.make("00000000-0000-0000-0000-000000000000")
      }))

    return mutations
  })
