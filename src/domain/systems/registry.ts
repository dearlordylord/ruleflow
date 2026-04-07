/**
 * System Registry - Single source of truth for all systems
 *
 * This pattern is inspired by ComponentRegistry in entity.ts.
 * All system types are derived from this registry.
 */
import { actionEconomySystem } from "./actionEconomy.js"
import { characterCreationSystem } from "./characterCreation.js"
import { combatToHitSystem, traumaSystem } from "./combat.js"
import { concentrationSystem } from "./concentration.js"
import { creatureDiscoverySystem } from "./creatureDiscovery.js"
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
import type { System, SystemEntry, SystemRequirements } from "./types.js"

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
  { name: "combatToHit", system: combatToHitSystem },

  // Combat systems (no dependencies)
  { name: "trauma", system: traumaSystem },
  { name: "criticalEffects", system: criticalEffectsSystem },
  { name: "grapple", system: grappleSystem },
  { name: "maneuvers", system: maneuversSystem },
  { name: "concentration", system: concentrationSystem },
  { name: "mysteryCasting", system: mysteryCastingSystem },

  // Combat encounter systems
  { name: "encounterSetup", system: encounterSetupSystem },
  { name: "declarationPhase", system: declarationPhaseSystem },
  { name: "initiative", system: initiativeSystem },
  { name: "turnManagement", system: turnManagementSystem },
  { name: "actionEconomy", system: actionEconomySystem },
  { name: "movement", system: movementSystem },
  { name: "defenseStance", system: defenseStanceSystem },
  { name: "readyAction", system: readyActionSystem },
  { name: "morale", system: moraleSystem },

  // Character systems
  { name: "characterCreation", system: characterCreationSystem },

  // Equipment systems
  { name: "equipment", system: equipmentSystem },
  { name: "durability", system: durabilitySystem },
  { name: "encumbranceValidation", system: encumbranceValidationSystem },
  { name: "attributeModifier", system: attributeModifierSystem },

  // Economy systems
  { name: "currencyTransfer", system: currencyTransferSystem },
  { name: "itemPurchase", system: itemPurchaseSystem },

  // Looting systems
  { name: "itemDiscovery", system: itemDiscoverySystem },
  { name: "containerDiscovery", system: containerDiscoverySystem },
  { name: "corpseCreation", system: corpseCreationSystem },
  { name: "itemLooting", system: itemLootingSystem },
  { name: "itemDrop", system: itemDropSystem },
  { name: "containerSearch", system: containerSearchSystem },
  { name: "containerLockDiscovery", system: containerLockDiscoverySystem },
  { name: "lootDistribution", system: lootDistributionSystem },

  // NPC systems
  { name: "creatureDiscovery", system: creatureDiscoverySystem }
] as const satisfies ReadonlyArray<SystemEntry<unknown>>

/**
 * Derive union of all system requirements from registry.
 * This captures all services that any system in the pipeline might need.
 */
export type AllSystemRequirements = SystemRequirements<typeof SystemRegistry[number]["system"]>

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
 * Returns System<AllSystemRequirements> since every system's R is a subset
 * of AllSystemRequirements (Effect is covariant in R).
 */
export function getAllSystems(): ReadonlyArray<System<AllSystemRequirements>> {
  return SystemRegistry.map((entry) => entry.system)
}
