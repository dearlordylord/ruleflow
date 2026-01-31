/**
 * Ranged Combat Mechanics
 */
import { Schema } from "effect"

import type { EntityId } from "../entities.js"

/**
 * Ammunition tracking
 */
export class AmmunitionComponent extends Schema.TaggedClass<AmmunitionComponent>()("Ammunition", {
  ammunitionType: Schema.Literal("Arrows", "Bolts", "Bullets", "Sling Bullets"),
  quantity: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Special ammunition properties
  isSpecial: Schema.Boolean,
  specialProperty: Schema.NullOr(Schema.NonEmptyString) // e.g., "Silver-tipped", "Fire arrows"
}) {}

/**
 * Reload state for weapons requiring loading
 */
export class ReloadStateComponent extends Schema.TaggedClass<ReloadStateComponent>()("ReloadState", {
  needsReload: Schema.Boolean,

  // Number of actions required to reload (e.g., 2 for arquebus)
  reloadActionsRequired: Schema.Int.pipe(Schema.greaterThan(0)),
  reloadActionsCompleted: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),

  // Firearm misfire tracking (1-in-6 chance)
  lastMisfireRoll: Schema.NullOr(Schema.Int.pipe(Schema.between(1, 6)))
}) {}

/**
 * Range distance penalties
 * Close: no penalty
 * Medium: -2 to hit
 * Long: -4 to hit
 */
export function getRangePenalty(
  distance: number,
  rangeClose: number,
  rangeMedium: number,
  rangeLong: number
): number {
  if (distance <= rangeClose) return 0
  if (distance <= rangeMedium) return -2
  if (distance <= rangeLong) return -4
  return -999 // Out of range, cannot hit
}

/**
 * Additional penalties for ranged attacks
 */
export function getRangedAttackPenalty(
  targetEngagedInMelee: boolean,
  shooterMovedThisTurn: boolean,
  shooterMounted: boolean
): number {
  let penalty = 0
  if (targetEngagedInMelee) penalty -= 4
  if (shooterMovedThisTurn && shooterMounted) penalty -= 4
  return penalty
}
