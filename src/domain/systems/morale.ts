/**
 * Morale System - NPC morale checks during combat
 */
import { Chunk, Effect } from "effect"

import { SetMoraleResultMutation } from "../combat/encounterMutations.js"
import type { MoraleChecked } from "../combat/moraleEvents.js"
import type { System } from "./types.js"

/**
 * Processes morale checks for NPCs
 * - Flight/Retreat: emit movement intent
 * - Defense/Offense: continue fighting
 * - VictoryOrDeath: no more checks
 *
 * Triggers:
 * - First casualty
 * - Half forces lost
 * - Numerical disadvantage 2:1
 * - Leader fallen
 *
 * TODO: Implement trigger detection
 */
export const moraleSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const moraleEvents = Chunk.filter(
      events,
      (event): event is MoraleChecked => event._tag === "MoraleChecked"
    )

    const mutations: Array<typeof SetMoraleResultMutation.Type> = []

    for (const moraleEvent of moraleEvents) {
      mutations.push(
        SetMoraleResultMutation.make({
          entityId: moraleEvent.entityId,
          result: moraleEvent.result
        })
      )

      // If fleeing, emit retreat declaration for next round
      if (moraleEvent.result === "Flight") {
        // TODO: Emit RetreatDeclared for next round
        // This requires round-start declaration phase orchestration
      }
    }

    // TODO: Implement trigger detection
    // - Monitor CharacterDied events for first casualty
    // - Track force strength for half-forces check
    // - Compare participant counts for numerical disadvantage

    return Chunk.fromIterable(mutations)
  })
