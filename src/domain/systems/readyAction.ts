/**
 * Ready Action System - Handles delayed actions with trigger conditions
 */
import { Chunk, Effect } from "effect"

import type {
  CombatRoundEnded,
  ReadyActionDeclared,
  ReadyActionTriggered as _ReadyActionTriggered
} from "../combat/encounterEvents.js"
import type { ClearReadyActionMutation as _ClearReadyActionMutation } from "../combat/encounterMutations.js"
import { SetReadyActionMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Manages ready actions
 * - Stores declared ready action
 * - Monitors for trigger conditions (TODO: needs event pattern matching)
 * - Clears if round ends without triggering
 */
export const readyActionSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<typeof SetReadyActionMutation.Type> = []

    // Handle ready action declarations
    const readyEvents = Chunk.filter(
      events,
      (event): event is ReadyActionDeclared => event._tag === "ReadyActionDeclared"
    )

    for (const readyEvent of readyEvents) {
      // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
      mutations.push(
        SetReadyActionMutation.make({
          entityId: readyEvent.entityId,
          triggerCondition: readyEvent.triggerCondition,
          actionType: readyEvent.actionType,
          targetId: readyEvent.targetId
        })
      )
    }

    // TODO: Monitor events for trigger conditions
    // This requires pattern matching on trigger condition strings
    // For MVP, trigger conditions are checked externally

    // Handle round end (clear untriggered ready actions)
    const roundEndEvents = Chunk.filter(
      events,
      (event): event is CombatRoundEnded => event._tag === "CombatRoundEnded"
    )

    if (!Chunk.isEmpty(roundEndEvents)) {
      // TODO: Find all entities with ready actions and clear them
      // This requires querying all entities with ReadyActionComponent
      // For now, clearing is done externally
    }

    return Chunk.fromIterable(mutations)
  })
