/**
 * Movement and Speed System
 */
import { Schema } from "effect"

/**
 * Movement speeds
 * Base speeds in feet per round (6 seconds):
 * - Human: 30 feet
 * - Dwarf/Halfling: 20 feet
 * - Elf: 30 feet
 * - Horse: 60 feet
 */
export class MovementComponent extends Schema.TaggedClass<MovementComponent>()("Movement", {
  // Base speed in feet per combat round
  baseSpeed: Schema.Int.pipe(Schema.greaterThan(0)),

  // Current speed (after modifiers)
  currentSpeed: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Movement penalties from armor, encumbrance
  armorPenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  encumbrancePenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Special movement modes
  canFly: Schema.Boolean,
  flySpeed: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),

  canSwim: Schema.Boolean,
  swimSpeed: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),

  canClimb: Schema.Boolean,
  climbSpeed: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0)))
}) {}

/**
 * Calculate current speed with penalties
 */
export function calculateCurrentSpeed(
  baseSpeed: number,
  armorPenalty: number,
  encumbrancePenalty: number,
  conditions: string[] // e.g., ["Prone", "Exhausted"]
): number {
  let speed = baseSpeed - armorPenalty - encumbrancePenalty

  // Prone: half speed
  if (conditions.includes("Prone")) speed = Math.floor(speed / 2)

  // Exhausted: reduced speed based on exhaustion level
  if (conditions.includes("Exhausted")) speed = Math.floor(speed / 2)

  return Math.max(0, speed)
}

/**
 * Travel speeds (exploration mode)
 * - Walking: 24 miles per day
 * - Forced march: 32 miles per day (exhaustion risk)
 * - Mounted: 40 miles per day
 */
export function getDailyTravelDistance(
  isMounted: boolean,
  isForcedMarch: boolean
): number {
  if (isMounted) return 40
  if (isForcedMarch) return 32
  return 24
}
