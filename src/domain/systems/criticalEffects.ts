/**
 * Critical Effects System - Handles critical hits and fumbles
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { AttackPerformed } from "../combat/events.js"
import { DamageEquipmentMutation } from "../combat/mutations.js"
import type { System } from "./types.js"

/**
 * Processes critical effects
 * - Natural 20: Always hits, damages armor/shield (-1 durability)
 * - Natural 1: Always misses, damages weapon (-1 durability)
 * - Margin (AC+10): Extra damage die (handled by combatToHitSystem)
 */
export const criticalEffectsSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const attackEvents = Chunk.filter(
      events,
      (event): event is AttackPerformed => event._tag === "AttackPerformed"
    )

    const mutations: Array<any> = []

    for (const attack of attackEvents) {
      // Natural 20: damage armor/shield
      if (attack.attackRoll === 20) {
        const target = yield* state.getEntity(attack.targetId).pipe(
          Effect.orElseSucceed(() => null)
        )

        if (!target) continue

        // Check for equipped armor or shield
        const equippedWeapons = getComponent(target, "EquippedWeapons")
        // TODO: Get armor/shield components
        // For now, just emit ArmorDamaged event without mutation
        // Armor/shield durability tracking needs equipment system integration

        mutations.push(
          // Placeholder: would need to find equipped armor/shield
          // DamageEquipmentMutation for shield or armor
        )
      }

      // Natural 1: damage weapon
      if (attack.attackRoll === 1) {
        mutations.push(
          // Weapon durability damage
          DamageEquipmentMutation.make({
            equipmentId: attack.weaponId,
            damage: 1
          })
        )
      }
    }

    return Chunk.fromIterable(mutations)
  })
