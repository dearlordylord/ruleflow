/**
 * Domain Layer - All domain concepts
 *
 * Bounded contexts:
 * - Character: Attributes, health, skills, traits, progression
 * - Combat: Weapons, armor, conditions, initiative
 * - Inventory: Items, currency, consumables
 * - Mysticism: Spells, concentration, artifacts
 * - NPC: Morale, reactions, loyalty, encounters
 * - World: Movement, position, lighting/vision
 */

// Core types
export * from "./entities.js"
export * from "./errors.js"

// Entity and component system
export * from "./entity.js"

// Domain contexts (re-exported with namespace)
export * as Character from "./character/index.js"
export * as Combat from "./combat/index.js"
export * as Inventory from "./inventory/index.js"
export * as Mysticism from "./mysticism/index.js"
export * as NPC from "./npc/index.js"
export * as World from "./world/index.js"

// Legacy components for backward compatibility (can be removed later)
// Importing from old components.ts if needed
