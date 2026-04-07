/**
 * Combat Domain - All combat-related concepts
 */

// Core combat stats
export * from "./stats.js"

// Weapon types (shared schemas)
export * from "./weaponTypes.js"

// Weapons and specialization
export * from "./weapons.js"

// Weapon registry (predefined definitions and lookup helpers)
export * from "./weaponRegistry.js"

// Armor and shields
export * from "./armor.js"
export * from "./equippedArmor.js"

// Conditions and status effects
export * from "./conditions.js"

// Ranged combat mechanics
export * from "./ranged.js"

// Mutations and events
export * from "./events.js"
export * from "./mutations.js"

// Encounter events
export * from "./concentrationEvents.js"
export * from "./encounterEvents.js"
export * from "./maneuverEvents.js"
export * from "./moraleEvents.js"
export * from "./mysteryEvents.js"

// Encounter components and mutations
export * from "./encounterComponents.js"
export * from "./encounterMutations.js"

// Helper functions
// Note: vulnerability.ts is not re-exported here to avoid circular dependency
// with entity.ts. Import directly from "./vulnerability.js" when needed.
