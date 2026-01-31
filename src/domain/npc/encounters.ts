/**
 * Random Encounter System
 */
import { Schema } from "effect"

/**
 * Terrain types affecting encounter chances
 */
export const TerrainType = Schema.Literal(
  "Bog", // 4 in 6 chance
  "Forest", // 3 in 6
  "Mountain", // 3 in 6
  "Hill", // 3 in 6
  "Plain", // 2 in 6
  "Road", // 2 in 6
  "City", // 1 in 6
  "Dungeon" // 1 in 6 per 10-minute turn
)
export type TerrainType = typeof TerrainType.Type

/**
 * Encounter chance by terrain
 */
export function getEncounterChance(terrain: TerrainType): number {
  switch (terrain) {
    case "Bog": return 4
    case "Forest":
    case "Mountain":
    case "Hill":
      return 3
    case "Plain":
    case "Road":
      return 2
    case "City":
    case "Dungeon":
      return 1
    default: return 1
  }
}

/**
 * Surprise mechanics
 * - Hidden & stationary: automatic surprise
 * - Hidden & moving: listen check
 * - Partially hidden: detection check
 */
export const SurpriseCondition = Schema.Literal(
  "Automatic", // Hidden and stationary
  "ListenCheck", // Hidden and moving
  "DetectionCheck", // Partially hidden
  "None" // No surprise
)
export type SurpriseCondition = typeof SurpriseCondition.Type

/**
 * Initial encounter distance
 * Dungeons: 2d6 × 10 feet
 * Wilderness: 4d6 × 10 yards (or 4d6 × 30 feet)
 */
export function getEncounterDistance(isDungeon: boolean): { dice: string; multiplier: number } {
  return isDungeon
    ? { dice: "2d6", multiplier: 10 } // feet
    : { dice: "4d6", multiplier: 30 } // feet (converted from yards)
}
