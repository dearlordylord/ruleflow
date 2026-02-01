/**
 * Turn Management System - Handles turn progression and round transitions
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { RemoveConditionMutation } from "../combat/mutations.js"
import { TurnStarted, TurnEnded, CombatRoundEnded } from "../combat/encounterEvents.js"
import { AdvanceTurnMutation, AdvanceSideMutation, ResetActionEconomyMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Manages turn order and round progression
 * - On TurnStarted: remove Vulnerable, reset actions
 * - On TurnEnded: advance to next entity or next side
 * - When both sides exhausted: end round (triggers new round with re-rolled initiative)
 */
export const turnManagementSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<any> = []

    // Handle turn starts
    const turnStartEvents = Chunk.filter(
      events,
      (event): event is TurnStarted => event._tag === "TurnStarted"
    )

    for (const turnStart of turnStartEvents) {
      const entity = yield* state.getEntity(turnStart.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const conditions = getComponent(entity, "Conditions")

      // Remove Vulnerable at start of entity's turn (if it was from first turn/declaration)
      if (conditions?.activeConditions.includes("Vulnerable")) {
        mutations.push(
          RemoveConditionMutation.make({
            entityId: turnStart.entityId,
            condition: "Vulnerable"
          })
        )
      }

      // Reset action economy
      mutations.push(
        ResetActionEconomyMutation.make({
          entityId: turnStart.entityId
        })
      )

      // TODO: Check DefenseStance expiration
      // TODO: Resolve mystery if caster
    }

    // Handle turn ends
    // TODO: Advance turn index, switch sides, or end round
    // This requires access to CombatEncounterComponent to determine turn order
    // For now, leave as placeholder for orchestration layer

    return Chunk.fromIterable(mutations)
  })
