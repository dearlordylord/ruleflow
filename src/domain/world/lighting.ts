/**
 * Lighting and Vision System
 */
import { Schema } from "effect"

/**
 * Light source types and radii
 */
export const LightSourceType = Schema.Literal(
  "Torch", // 20' radius, 6 hours
  "Candle", // 5' radius, 1 hour
  "Lamp", // 30' radius, 6 hours
  "Lantern", // 40' radius, 6 hours
  "GlowingStick", // 10' radius, 6 hours
  "Daylight", // Unlimited
  "Darkness" // 0
)
export type LightSourceType = typeof LightSourceType.Type

export class LightSourceComponent extends Schema.TaggedClass<LightSourceComponent>()("LightSource", {
  lightType: LightSourceType,

  // Light radius in feet
  radiusInFeet: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Duration remaining (in turns or hours)
  durationRemaining: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),

  // Is currently lit
  isActive: Schema.Boolean
}) {}

/**
 * Vision types
 */
export const VisionType = Schema.Literal(
  "Normal", // Requires light
  "Darkvision", // See in darkness (60-120 feet typical)
  "Blindsight", // See without light, ignore invisibility
  "Tremorsense" // Detect vibrations
)
export type VisionType = typeof VisionType.Type

export class VisionComponent extends Schema.TaggedClass<VisionComponent>()("Vision", {
  visionType: VisionType,

  // Vision range in feet
  visionRange: Schema.Int.pipe(Schema.greaterThan(0)),

  // Can see invisible creatures
  canSeeInvisible: Schema.Boolean,

  // Currently blinded
  isBlinded: Schema.Boolean
}) {}

/**
 * Get light radius for each source type
 */
export function getLightRadius(lightType: LightSourceType): number {
  switch (lightType) {
    case "Torch": return 20
    case "Candle": return 5
    case "Lamp": return 30
    case "Lantern": return 40
    case "GlowingStick": return 10
    case "Daylight": return 999999
    case "Darkness": return 0
    default: return 0
  }
}

/**
 * Check if target is visible from position
 */
export function isVisible(
  distance: number,
  lightRadius: number,
  visionRange: number,
  targetIsInvisible: boolean,
  canSeeInvisible: boolean
): boolean {
  if (targetIsInvisible && !canSeeInvisible) return false
  if (distance > visionRange) return false
  if (lightRadius === 0 && visionRange < 60) return false // Assumes normal vision needs light
  return distance <= Math.max(lightRadius, visionRange)
}
