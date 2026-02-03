/**
 * System pipeline runner
 */
import { Chunk, Effect } from "effect"

import type { DomainError } from "../errors.js"
import type { DomainEvent } from "../events.js"
import { GameState } from "../infrastructure/GameState.js"
import type { Mutation } from "../mutations.js"
import type { AllSystemRequirements } from "./registry.js"
import { getAllSystems } from "./registry.js"
import type { System } from "./types.js"

// Re-export individual systems for backward compatibility
export { characterCreationSystem } from "./characterCreation.js"
export { combatToHitSystem, traumaSystem } from "./combat.js"
export { creatureDiscoverySystem } from "./creatureDiscovery.js"
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
export { monsterDamageSystem } from "./monsterDamage.js"
export type { System } from "./types.js"

// Combat encounter systems
export { actionEconomySystem } from "./actionEconomy.js"
export { concentrationSystem } from "./concentration.js"
export { criticalEffectsSystem } from "./criticalEffects.js"
export { declarationPhaseSystem } from "./declarationPhase.js"
export { defenseStanceSystem } from "./defenseStance.js"
export { encounterSetupSystem } from "./encounterSetup.js"
export { grappleSystem } from "./grapple.js"
export { initiativeSystem } from "./initiative.js"
export { maneuversSystem } from "./maneuvers.js"
export { moraleSystem } from "./morale.js"
export { movementSystem } from "./movement.js"
export { mysteryCastingSystem } from "./mysteryCasting.js"
export { readyActionSystem } from "./readyAction.js"
export { turnManagementSystem } from "./turnManagement.js"

// Re-export registry types and utilities
export type { AllSystemRequirements, RegisteredSystem, SystemName } from "./registry.js"
export { getAllSystems, getSystemByName, SystemRegistry } from "./registry.js"

/**
 * Runs systems sequentially, passing accumulated mutations to each subsequent system.
 * Order matters: systems may depend on mutations produced by earlier systems.
 *
 * The return type includes AllSystemRequirements (derived from the registry),
 * ensuring the pipeline requires all services that any included system needs.
 *
 * Known dependencies:
 * - traumaSystem must run AFTER combatToHitSystem (reads DealDamageMutation)
 *
 * TODO: Make dependencies explicit via a dependency graph where systems declare
 * what mutation types they consume/produce, allowing the pipeline to auto-order.
 */
export const runSystemsPipeline = (
  systems: Array<System<AllSystemRequirements>>,
  events: Chunk.Chunk<DomainEvent> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState | AllSystemRequirements> =>
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

/**
 * Runs all registered systems in the order they appear in the registry.
 * Requires all system dependencies (AllSystemRequirements) to be provided.
 */
export const runAllSystems = (
  events: Chunk.Chunk<DomainEvent> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState | AllSystemRequirements> =>
  runSystemsPipeline([...getAllSystems()] as Array<System<AllSystemRequirements>>, events)
