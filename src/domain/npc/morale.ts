/**
 * Morale System - NPC/Monster morale checks
 */
import { Schema } from "effect"

/**
 * Morale value ranges from -4 to +4
 */
export class MoraleComponent extends Schema.TaggedClass<MoraleComponent>()("Morale", {
  moraleValue: Schema.Int.pipe(Schema.between(-4, 4))
}) {}

/**
 * Morale check results (2d6 + morale value)
 */
export const MoraleResult = Schema.Literal(
  "Flight", // ≤ 2: Flee as fast as possible or surrender
  "Retreat", // 3-5: Organized retreat with cover
  "Defense", // 6-8: Continue fighting for life, won't pursue
  "Offense", // 9-11: Continue attacking, will pursue
  "VictoryOrDeath" // 12+: Fight to the end, no more checks
)
export type MoraleResult = typeof MoraleResult.Type

/**
 * Determine morale result from 2d6 roll + morale value
 */
export function getMoraleResult(roll: number, moraleValue: number): MoraleResult {
  const total = roll + moraleValue

  if (total <= 2) return "Flight"
  if (total <= 5) return "Retreat"
  if (total <= 8) return "Defense"
  if (total <= 11) return "Offense"
  return "VictoryOrDeath"
}

/**
 * Morale check triggers (critical moments)
 * - Side has 2:1 numerical disadvantage
 * - Side loses first combatant
 * - Side's forces reduced by half
 */
export const MoraleCheckTrigger = Schema.Literal(
  "NumericalDisadvantage",
  "FirstCasualty",
  "HalfForces",
  "LeaderFallen"
)
export type MoraleCheckTrigger = typeof MoraleCheckTrigger.Type
