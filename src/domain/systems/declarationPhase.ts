/**
 * Declaration Phase System - Handles pre-initiative declarations
 */
import { Chunk, Effect } from "effect"

import { AddConditionMutation } from "../combat/mutations.js"
import {
  MysteryCastDeclared,
  WithdrawalDeclared,
  RetreatDeclared
} from "../combat/encounterEvents.js"
import { SetMysteryCastingMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Processes declarations made before initiative roll
 * - Mystery casters: add Vulnerable + Concentrating
 * - Retreaters: add Vulnerable until their turn
 */
export const declarationPhaseSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<any> = []

    // Mystery casting declarations
    const mysteryCastEvents = Chunk.filter(
      events,
      (event): event is MysteryCastDeclared => event._tag === "MysteryCastDeclared"
    )

    for (const mysteryEvent of mysteryCastEvents) {
      mutations.push(
        // Mark caster as vulnerable until their turn
        AddConditionMutation.make({
          entityId: mysteryEvent.entityId,
          condition: "Vulnerable"
        }),
        // Mark as concentrating
        AddConditionMutation.make({
          entityId: mysteryEvent.entityId,
          condition: "Concentrating"
        }),
        // Track mystery casting state
        SetMysteryCastingMutation.make({
          entityId: mysteryEvent.entityId,
          mysteryName: mysteryEvent.mysteryName,
          isMaintenanceOnly: mysteryEvent.isMaintenanceOnly,
          declaredThisRound: true,
          resolved: false
        })
      )
    }

    // Withdrawal declarations (no vulnerability)
    // Just tracking for movement validation

    // Retreat declarations
    const retreatEvents = Chunk.filter(
      events,
      (event): event is RetreatDeclared => event._tag === "RetreatDeclared"
    )

    for (const retreatEvent of retreatEvents) {
      // Mark retreater as vulnerable until their turn
      mutations.push(
        AddConditionMutation.make({
          entityId: retreatEvent.entityId,
          condition: "Vulnerable"
        })
      )
    }

    return Chunk.fromIterable(mutations)
  })
