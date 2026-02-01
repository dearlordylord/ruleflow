/**
 * Grapple System - Handles grappling mechanics
 */
import { Chunk, Effect } from "effect"

import type { GrappleAttempted } from "../combat/events.js"
import { AddConditionMutation, SetGrappleStateMutation } from "../combat/mutations.js"
import type { System } from "./types.js"

/**
 * Processes grapple attempts
 * - Sets grapple state for both entities
 * - Adds "Grappled" condition to target
 * - Adds "Vulnerable" to BOTH (vulnerable to third parties only)
 * - If pinned: adds "Prone" to target
 */
export const grappleSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const grappleEvents = Chunk.filter(
      events,
      (event): event is GrappleAttempted => event._tag === "GrappleAttempted"
    )

    const mutations: Array<any> = []

    for (const grapple of grappleEvents) {
      if (!grapple.success) continue

      mutations.push(
        // Set grapple state for target (grappled by grappler)
        SetGrappleStateMutation.make({
          entityId: grapple.targetId,
          grappledBy: grapple.grapplerId,
          isPinned: false // TODO: detect pin from subsequent contests
        }),
        // Add "Grappled" condition to target
        AddConditionMutation.make({
          entityId: grapple.targetId,
          condition: { _type: "Grappled" }
        }),
        // Both are vulnerable to third parties
        AddConditionMutation.make({
          entityId: grapple.targetId,
          condition: { _type: "Vulnerable" }
        }),
        AddConditionMutation.make({
          entityId: grapple.grapplerId,
          condition: { _type: "Vulnerable" }
        })
      )

      // TODO: Handle pinning (subsequent contest after grapple established)
      // If pinned:
      // - AddConditionMutation({ _type: "Prone" }) for target
      // - SetGrappleStateMutation with isPinned: true
    }

    return Chunk.fromIterable(mutations)
  })
