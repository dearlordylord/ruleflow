/**
 * Encounter Setup System - Initializes combat encounters
 */
import { Chunk, Effect } from "effect"

import { AddConditionMutation } from "../combat/mutations.js"
import { CombatStarted } from "../combat/events.js"
import { StartCombatRoundMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Sets up combat encounter state
 * - Marks surprised participants as Vulnerable
 * - Starts first round
 */
export const encounterSetupSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const combatStartEvents = Chunk.filter(
      events,
      (event): event is CombatStarted => event._tag === "CombatStarted"
    )

    if (Chunk.isEmpty(combatStartEvents)) {
      return Chunk.empty()
    }

    const combatStart = Chunk.unsafeHead(combatStartEvents)

    const mutations = Chunk.fromIterable([
      // Mark surprised participants as vulnerable
      ...combatStart.surprisedParticipants.map(entityId =>
        AddConditionMutation.make({
          entityId,
          condition: "Vulnerable"
        })
      ),
      // Start first round (default to Players side, will be determined by initiative)
      StartCombatRoundMutation.make({
        roundNumber: 1,
        activeSide: "Players"
      })
    ])

    return mutations
  })
