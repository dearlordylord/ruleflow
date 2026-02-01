/**
 * Defense Stance System - Handles +2 AC defensive posture
 */
import { Chunk, Effect } from "effect"

import type { DefenseStanceTaken, TurnStarted } from "../combat/encounterEvents.js"
import { SetDefenseStanceMutation } from "../combat/encounterMutations.js"
import { getComponent } from "../entity.js"
import type { System } from "./types.js"

/**
 * Manages defense stance (+2 AC until next turn)
 */
export const defenseStanceSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<typeof SetDefenseStanceMutation.Type> = []

    // Handle defense stance activation
    const defenseEvents = Chunk.filter(
      events,
      (event): event is DefenseStanceTaken => event._tag === "DefenseStanceTaken"
    )

    for (const defenseEvent of defenseEvents) {
      mutations.push(
        SetDefenseStanceMutation.make({
          entityId: defenseEvent.entityId,
          active: true,
          bonusAC: 2,
          expiresOnTurnOf: defenseEvent.entityId // expires at start of own next turn
        })
      )
    }

    // Handle defense stance expiration
    const turnStartEvents = Chunk.filter(
      events,
      (event): event is TurnStarted => event._tag === "TurnStarted"
    )

    for (const turnStart of turnStartEvents) {
      const entity = yield* state.getEntity(turnStart.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const defenseStance = getComponent(entity, "DefenseStance")
      if (defenseStance?.active && defenseStance.expiresOnTurnOf === turnStart.entityId) {
        mutations.push(
          SetDefenseStanceMutation.make({
            entityId: turnStart.entityId,
            active: false,
            bonusAC: 0,
            expiresOnTurnOf: null
          })
        )
      }
    }

    return Chunk.fromIterable(mutations)
  })
