/**
 * Inventory Domain - All inventory-related concepts
 */

// Items and encumbrance
export * from "./items.js"

// Currency system
export * from "./currency.js"

// Consumables
export * from "./consumables.js"

// Looting components
export * from "./looting.js"

// Events only (mutations exported from top-level mutations.ts)
// Note: componentMutations.ts is not re-exported here to avoid circular dependency
// with entity.ts. Import directly from "./componentMutations.js" when needed.
export * from "./events.js"

// Looting events
export * from "./loot-events.js"
