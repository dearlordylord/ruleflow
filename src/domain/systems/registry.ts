/**
 * System Registry - Single source of truth for all systems
 *
 * This pattern is inspired by ComponentRegistry in entity.ts.
 * All system types are derived from this registry.
 */
import type { CombatResolver } from "../services/CombatResolver.js"
import { actionEconomySystem } from "./actionEconomy.js"
import { characterCreationSystem } from "./characterCreation.js"
import { combatToHitSystem, traumaSystem } from "./combat.js"
import { concentrationSystem } from "./concentration.js"
import { criticalEffectsSystem } from "./criticalEffects.js"
import { currencyTransferSystem } from "./currency.js"
import { declarationPhaseSystem } from "./declarationPhase.js"
import { defenseStanceSystem } from "./defenseStance.js"
import { durabilitySystem } from "./durability.js"
import { encounterSetupSystem } from "./encounterSetup.js"
import { attributeModifierSystem, encumbranceValidationSystem } from "./encumbrance.js"
import { equipmentSystem } from "./equipment.js"
import { grappleSystem } from "./grapple.js"
import { initiativeSystem } from "./initiative.js"
import { itemPurchaseSystem } from "./itemPurchase.js"
import {
  containerDiscoverySystem,
  containerLockDiscoverySystem,
  containerSearchSystem,
  corpseCreationSystem,
  itemDiscoverySystem,
  itemDropSystem,
  itemLootingSystem,
  lootDistributionSystem
} from "./looting.js"
import { maneuversSystem } from "./maneuvers.js"
import { moraleSystem } from "./morale.js"
import { movementSystem } from "./movement.js"
import { mysteryCastingSystem } from "./mysteryCasting.js"
import { readyActionSystem } from "./readyAction.js"
import { turnManagementSystem } from "./turnManagement.js"
import type { SystemEntry } from "./types.js"

/**
 * System Registry - defines all systems with their requirements.
 *
 * The _R field is a phantom type used only for type-level inference.
 * At runtime it's just an empty object cast to the requirement type.
 *
 * Systems with `never` as R have no external dependencies.
 * Systems with specific services (e.g., CombatResolver) require those to be provided.
 */
export const SystemRegistry = [
  // Combat systems (with dependencies)
  { name: "combatToHit", system: combatToHitSystem, _R: {} as CombatResolver },

  // Combat systems (no dependencies)
  { name: "trauma", system: traumaSystem, _R: {} as never },
  { name: "criticalEffects", system: criticalEffectsSystem, _R: {} as never },
  { name: "grapple", system: grappleSystem, _R: {} as never },
  { name: "maneuvers", system: maneuversSystem, _R: {} as never },
  { name: "concentration", system: concentrationSystem, _R: {} as never },
  { name: "mysteryCasting", system: mysteryCastingSystem, _R: {} as never },

  // Combat encounter systems
  { name: "encounterSetup", system: encounterSetupSystem, _R: {} as never },
  { name: "declarationPhase", system: declarationPhaseSystem, _R: {} as never },
  { name: "initiative", system: initiativeSystem, _R: {} as never },
  { name: "turnManagement", system: turnManagementSystem, _R: {} as never },
  { name: "actionEconomy", system: actionEconomySystem, _R: {} as never },
  { name: "movement", system: movementSystem, _R: {} as never },
  { name: "defenseStance", system: defenseStanceSystem, _R: {} as never },
  { name: "readyAction", system: readyActionSystem, _R: {} as never },
  { name: "morale", system: moraleSystem, _R: {} as never },

  // Character systems
  { name: "characterCreation", system: characterCreationSystem, _R: {} as never },

  // Equipment systems
  { name: "equipment", system: equipmentSystem, _R: {} as never },
  { name: "durability", system: durabilitySystem, _R: {} as never },
  { name: "encumbranceValidation", system: encumbranceValidationSystem, _R: {} as never },
  { name: "attributeModifier", system: attributeModifierSystem, _R: {} as never },

  // Economy systems
  { name: "currencyTransfer", system: currencyTransferSystem, _R: {} as never },
  { name: "itemPurchase", system: itemPurchaseSystem, _R: {} as never },

  // Looting systems
  { name: "itemDiscovery", system: itemDiscoverySystem, _R: {} as never },
  { name: "containerDiscovery", system: containerDiscoverySystem, _R: {} as never },
  { name: "corpseCreation", system: corpseCreationSystem, _R: {} as never },
  { name: "itemLooting", system: itemLootingSystem, _R: {} as never },
  { name: "itemDrop", system: itemDropSystem, _R: {} as never },
  { name: "containerSearch", system: containerSearchSystem, _R: {} as never },
  { name: "containerLockDiscovery", system: containerLockDiscoverySystem, _R: {} as never },
  { name: "lootDistribution", system: lootDistributionSystem, _R: {} as never }
] as const satisfies ReadonlyArray<SystemEntry<unknown>>

/**
 * Derive union of all system requirements from registry.
 * This captures all services that any system in the pipeline might need.
 */
export type AllSystemRequirements = typeof SystemRegistry[number]["_R"]

/**
 * Derive list of all system names (for type-safe system lookup).
 */
export type SystemName = typeof SystemRegistry[number]["name"]

/**
 * Type for a single system from the registry.
 */
export type RegisteredSystem = typeof SystemRegistry[number]["system"]

/**
 * Helper to get a system by name from the registry.
 */
export function getSystemByName<N extends SystemName>(
  name: N
): typeof SystemRegistry[number] & { name: N } {
  const entry = SystemRegistry.find((s) => s.name === name)
  // This is a programming error - caller passed an invalid system name
  // Since SystemName is a union type, this should never happen at runtime
  // if TypeScript types are respected. We use an assertion here.
  // eslint-disable-next-line functional/no-throw-statements -- Programming error, not domain error
  if (!entry) throw new Error(`System ${name} not found in registry`)
  return entry as typeof SystemRegistry[number] & { name: N }
}

/**
 * Get all systems as an array (for running the full pipeline).
 */
export function getAllSystems(): ReadonlyArray<RegisteredSystem> {
  return SystemRegistry.map((entry) => entry.system)
}
