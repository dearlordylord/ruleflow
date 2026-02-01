/**
 * Mystery Casting System - Resolves mysteries on caster's turn
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { TurnStarted } from "../combat/encounterEvents.js"
import { MysteryResolved } from "../combat/mysteryEvents.js"
import { SetMysteryCastingMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Resolves mysteries when caster's turn starts
 * - Mystery was declared before initiative
 * - Effects take place on caster's turn (not when declared)
 * - If concentration broken before turn: mystery fails, no CP spent
 */
export const mysteryCastingSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const turnStartEvents = Chunk.filter(
      events,
      (event): event is TurnStarted => event._tag === "TurnStarted"
    )

    const mutations: Array<any> = []
    const mysteryResolvedEvents: Array<any> = []

    for (const turnStart of turnStartEvents) {
      const entity = yield* state.getEntity(turnStart.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const mysteryCasting = getComponent(entity, "MysteryCasting")
      const conditions = getComponent(entity, "Conditions")

      // Check if mystery was declared and not yet resolved
      if (!mysteryCasting?.declaredThisRound || mysteryCasting.resolved) continue

      // Check if still concentrating (not broken)
      if (!conditions?.activeConditions.includes("Concentrating")) {
        // Concentration was broken, mystery fails
        mutations.push(
          SetMysteryCastingMutation.make({
            entityId: turnStart.entityId,
            mysteryName: mysteryCasting.mysteryName,
            isMaintenanceOnly: mysteryCasting.isMaintenanceOnly,
            declaredThisRound: false,
            resolved: false
          })
        )
        continue
      }

      // Resolve mystery
      mysteryResolvedEvents.push(
        MysteryResolved.make({
          entityId: turnStart.entityId,
          mysteryName: mysteryCasting.mysteryName,
          targets: [] // TODO: get targets from mystery data
        })
      )

      mutations.push(
        SetMysteryCastingMutation.make({
          entityId: turnStart.entityId,
          mysteryName: mysteryCasting.mysteryName,
          isMaintenanceOnly: mysteryCasting.isMaintenanceOnly,
          declaredThisRound: mysteryCasting.declaredThisRound,
          resolved: true
        })
      )
    }

    // TODO: Emit MysteryResolved events for other systems to process
    return Chunk.fromIterable(mutations)
  })
