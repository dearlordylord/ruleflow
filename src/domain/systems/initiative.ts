/**
 * Initiative System - Side-based initiative (re-rolled each round)
 */
import { Chunk, Effect } from "effect"

// @ts-expect-error - TODO: Will be used when individual initiative implemented
import { getComponent } from "../entity.js"
import { InitiativeRolled } from "../combat/events.js"
// @ts-expect-error - TODO: Will be used when round-based initiative implemented
import { CombatRoundStarted } from "../combat/encounterEvents.js"
import { RollInitiativeMutation } from "../combat/mutations.js"
// @ts-expect-error - TODO: Will be used when system error tracking implemented
import { SystemName } from "../entities.js"
// @ts-expect-error - TODO: Will be used when system error tracking implemented
import { DomainError } from "../errors.js"
import type { System } from "./types.js"

/**
 * Processes initiative rolls (side-based)
 * - Each side rolls d6
 * - Higher roll acts first
 * - Within side: sort by dexterity
 *
 * TODO: Support individual initiative mode
 */
export const initiativeSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const initiativeEvents = Chunk.filter(
      events,
      (event): event is InitiativeRolled => event._tag === "InitiativeRolled"
    )

    if (Chunk.isEmpty(initiativeEvents)) {
      return Chunk.empty()
    }

    const mutations: Array<any> = []

    // Store initiative for each entity
    for (const initEvent of initiativeEvents) {
      mutations.push(
        RollInitiativeMutation.make({
          entityId: initEvent.entityId,
          roll: initEvent.roll,
          modifier: 0 // TODO: combat reflexes trait modifier
        })
      )
    }

    // TODO: When all participants have rolled, emit CombatRoundStarted with winning side
    // For now, systems will be triggered sequentially, so CombatRoundStarted
    // should be emitted by a higher-level orchestrator after all initiative rolls

    return Chunk.fromIterable(mutations)
  })
