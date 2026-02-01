/**
 * Action Economy System - Validates action usage
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { MovementPerformed } from "../combat/encounterEvents.js"
import { UseActionMutation } from "../combat/mutations.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import type { System } from "./types.js"

/**
 * Validates and tracks action economy
 * - Main actions: Attack, Defense, Disarm, Push, Ready, Cast
 * - Movement actions: Movement
 * - Full actions: Run (uses main + movement)
 */
export const actionEconomySystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const mutations: Array<any> = []
    const errors: Array<DomainError> = []

    // Check main action events
    const mainActionEvents = Chunk.filter(events, (event) =>
      event._tag === "AttackPerformed" ||
      event._tag === "DefenseStanceTaken" ||
      event._tag === "ReadyActionDeclared" ||
      event._tag === "DisarmAttempted" ||
      event._tag === "PushAttempted"
    )

    for (const actionEvent of mainActionEvents) {
      const entityId = "entityId" in actionEvent ? actionEvent.entityId :
        "attackerId" in actionEvent ? actionEvent.attackerId :
        "disarmerId" in actionEvent ? actionEvent.disarmerId :
        actionEvent.pusherId

      const entity = yield* state.getEntity(entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const actionEconomy = getComponent(entity, "ActionEconomy")
      const conditions = getComponent(entity, "Conditions")

      // Check if entity can act (not stunned/paralyzed/unconscious)
      if (conditions) {
        const cannotAct = conditions.activeConditions.some(c =>
          c === "Stunned" || c === "Paralyzed" || c === "Unconscious"
        )
        if (cannotAct) {
          errors.push(
            DomainError.make({
              systemName: SystemName.make("ActionEconomy"),
              message: `Entity ${entityId} cannot act due to condition`
            })
          )
          continue
        }
      }

      // Check if main action available
      if (actionEconomy && actionEconomy.mainActionsAvailable <= 0) {
        errors.push(
          DomainError.make({
            systemName: SystemName.make("ActionEconomy"),
            message: `Entity ${entityId} has no main actions available`
          })
        )
        continue
      }

      mutations.push(
        UseActionMutation.make({
          entityId,
          actionType: "Main"
        })
      )
    }

    // Check movement actions
    const movementEvents = Chunk.filter(
      events,
      (event): event is MovementPerformed => event._tag === "MovementPerformed"
    )

    for (const moveEvent of movementEvents) {
      const entity = yield* state.getEntity(moveEvent.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const actionEconomy = getComponent(entity, "ActionEconomy")
      const conditions = getComponent(entity, "Conditions")

      // Check if grappled/restrained (cannot move)
      if (conditions?.activeConditions.some(c => c === "Grappled" || c === "Restrained")) {
        errors.push(
          DomainError.make({
            systemName: SystemName.make("ActionEconomy"),
            message: `Entity ${moveEvent.entityId} cannot move (grappled/restrained)`
          })
        )
        continue
      }

      // Check if movement action available
      if (actionEconomy && actionEconomy.movementActionsAvailable <= 0) {
        errors.push(
          DomainError.make({
            systemName: SystemName.make("ActionEconomy"),
            message: `Entity ${moveEvent.entityId} has no movement actions available`
          })
        )
        continue
      }

      mutations.push(
        UseActionMutation.make({
          entityId: moveEvent.entityId,
          actionType: "Movement"
        })
      )
    }

    if (Chunk.size(Chunk.fromIterable(errors)) > 0) {
      return Effect.fail(Chunk.fromIterable(errors))
    }

    return Chunk.fromIterable(mutations)
  })
