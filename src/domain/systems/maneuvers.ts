/**
 * Combat Maneuvers System - Disarm, Push, etc.
 */
import { Chunk, Effect } from "effect"

import type { DisarmAttempted, PushAttempted } from "../combat/maneuverEvents.js"
import { AddConditionMutation, UnequipWeaponMutation } from "../combat/mutations.js"
// TODO: import { SetDistanceMutation } from "../combat/encounterMutations.js"
import type { System } from "./types.js"

/**
 * Processes combat maneuvers
 */
export const maneuversSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<typeof UnequipWeaponMutation.Type | typeof AddConditionMutation.Type> = []

    // Disarm attempts
    const disarmEvents = Chunk.filter(
      events,
      (event): event is DisarmAttempted => event._tag === "DisarmAttempted"
    )

    for (const disarm of disarmEvents) {
      if (!disarm.success) continue

      if (disarm.itemDisarmed) {
        mutations.push(
          UnequipWeaponMutation.make({
            entityId: disarm.targetId,
            hand: "MainHand" // TODO: determine which hand
          })
        )
        // TODO: Drop weapon on ground (requires item/position tracking)
      }
    }

    // Push attempts
    const pushEvents = Chunk.filter(
      events,
      (event): event is PushAttempted => event._tag === "PushAttempted"
    )

    for (const push of pushEvents) {
      if (!push.success) continue

      if (push.knockedProne) {
        mutations.push(
          AddConditionMutation.make({
            entityId: push.targetId,
            condition: { _type: "Prone" }
          })
        )
      }

      if (push.distancePushed > 0) {
        // TODO: Update DistanceComponent
        // Requires tracking distances between entities
        // For now, push distance is validated but not automatically applied
      }
    }

    return Chunk.fromIterable(mutations)
  })
