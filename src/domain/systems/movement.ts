/**
 * Movement System - Handles entity movement and distance tracking
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../entity.js"
import { MovementPerformed } from "../combat/encounterEvents.js"
import type { Mutation } from "../mutations.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import type { System } from "./types.js"

/**
 * Processes movement and updates distances
 * - Validates movement constraints (speed, conditions)
 * - Updates DistanceComponent for all affected entities
 */
export const movementSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const movementEvents = Chunk.filter(
      events,
      (event): event is MovementPerformed => event._tag === "MovementPerformed"
    )

    const mutations: Array<Mutation> = []
    const errors: Array<DomainError> = []

    for (const moveEvent of movementEvents) {
      const entity = yield* state.getEntity(moveEvent.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const movement = getComponent(entity, "Movement")

      if (!movement) {
        errors.push(
          DomainError.make({
            systemName: SystemName.make("Movement"),
            message: `Entity ${moveEvent.entityId} has no MovementComponent`
          })
        )
        continue
      }

      // Calculate allowed movement
      let allowedDistance = movement.currentSpeed

      if (moveEvent.isWithdrawal) {
        allowedDistance = Math.floor(movement.currentSpeed / 2)
      } else if (moveEvent.isRetreat) {
        allowedDistance = movement.currentSpeed // or triple if running (full action)
      }

      // Validate distance
      if (moveEvent.distanceMoved > allowedDistance) {
        errors.push(
          DomainError.make({
            systemName: SystemName.make("Movement"),
            message: `Entity ${moveEvent.entityId} attempted to move ${moveEvent.distanceMoved} feet but can only move ${allowedDistance} feet`
          })
        )
        continue
      }

      // TODO: Update DistanceComponent
      // This requires knowing target positions or updating distances to all other entities
      // For now, movement is validated but distances aren't automatically updated
      // Distance tracking would be handled by higher-level orchestration
    }

    return errors.length > 0
      ? yield* Effect.fail(Chunk.fromIterable(errors))
      : Chunk.fromIterable(mutations)
  })
