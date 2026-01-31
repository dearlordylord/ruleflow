/**
 * Position and Distance Tracking
 */
import { Schema } from "effect"

/**
 * 2D position (for tactical combat grid)
 */
export class PositionComponent extends Schema.TaggedClass<PositionComponent>()("Position", {
  x: Schema.Number,
  y: Schema.Number,

  // For 3D environments
  z: Schema.Number,

  // Current map/area ID
  locationId: Schema.NullOr(Schema.String)
}) {}

/**
 * Calculate distance between two positions (feet)
 * Uses Euclidean distance
 */
export function calculateDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  const dx = pos2.x - pos1.x
  const dy = pos2.y - pos1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Check if target is within melee reach (default 5 feet)
 */
export function isWithinReach(
  attackerPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  reach: number = 5
): boolean {
  return calculateDistance(attackerPos, targetPos) <= reach
}

/**
 * Check if target is within range for ranged attack
 */
export function isWithinRange(
  attackerPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  maxRange: number
): boolean {
  return calculateDistance(attackerPos, targetPos) <= maxRange
}

/**
 * Get range category (close/medium/long) for ranged attack
 */
export function getRangeCategory(
  distance: number,
  closeRange: number,
  mediumRange: number,
  longRange: number
): "Close" | "Medium" | "Long" | "OutOfRange" {
  if (distance <= closeRange) return "Close"
  if (distance <= mediumRange) return "Medium"
  if (distance <= longRange) return "Long"
  return "OutOfRange"
}
