/**
 * System pipeline runner
 */
import { Chunk, Effect } from "effect"

import type { DomainError } from "../errors.js"
import type { DomainEvent } from "../events.js"
import { GameState } from "../infrastructure/GameState.js"
import type { Mutation } from "../mutations.js"
import type { System } from "./types.js"

export { characterCreationSystem } from "./characterCreation.js"
export { combatToHitSystem, traumaSystem } from "./combat.js"
export { currencyTransferSystem } from "./currency.js"
export { durabilitySystem } from "./durability.js"
export { attributeModifierSystem, encumbranceValidationSystem } from "./encumbrance.js"
export { equipmentSystem } from "./equipment.js"
export { itemPurchaseSystem } from "./itemPurchase.js"
export {
  containerDiscoverySystem,
  containerLockDiscoverySystem,
  containerSearchSystem,
  corpseCreationSystem,
  itemDiscoverySystem,
  itemDropSystem,
  itemLootingSystem,
  lootDistributionSystem
} from "./looting.js"
export type { System } from "./types.js"

// Combat encounter systems
export { encounterSetupSystem } from "./encounterSetup.js"
export { declarationPhaseSystem } from "./declarationPhase.js"
export { initiativeSystem } from "./initiative.js"
export { turnManagementSystem } from "./turnManagement.js"
export { actionEconomySystem } from "./actionEconomy.js"
export { movementSystem } from "./movement.js"
export { grappleSystem } from "./grapple.js"
export { maneuversSystem } from "./maneuvers.js"
export { defenseStanceSystem } from "./defenseStance.js"
export { readyActionSystem } from "./readyAction.js"
export { moraleSystem } from "./morale.js"
export { criticalEffectsSystem } from "./criticalEffects.js"
export { concentrationSystem } from "./concentration.js"
export { mysteryCastingSystem } from "./mysteryCasting.js"

export const runSystemsPipeline = (
  systems: Array<System>,
  events: Chunk.Chunk<DomainEvent> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function*() {
    const state = yield* GameState

    const mutations = yield* Effect.reduce(
      systems,
      Chunk.empty<Mutation>(),
      (accumulatedMutations, system) =>
        Effect.gen(function*() {
          const newMutations = yield* system(state, events, accumulatedMutations)
          return Chunk.appendAll(accumulatedMutations, newMutations)
        })
    )

    return mutations
  })
