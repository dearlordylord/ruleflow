/**
 * Character Health and Trauma
 */
import { Schema } from "effect"

import type { SetHealthMutation } from "./mutations.js"

export const TraumaEffect = Schema.Literal("Bleeding", "Unconscious", "Wounded")
export type TraumaEffect = typeof TraumaEffect.Type

const DEFAULT_HEALTH = {
  current: 10,
  max: 10,
  traumaActive: false,
  traumaEffect: null
} as const

export class HealthComponent extends Schema.TaggedClass<HealthComponent>()("Health", {
  current: Schema.Int,
  max: Schema.Int.pipe(Schema.greaterThan(0)),
  traumaActive: Schema.Boolean,
  traumaEffect: Schema.NullOr(TraumaEffect)
}) {
  static applyMutation(
    existing: HealthComponent | null,
    mutation: SetHealthMutation
  ): HealthComponent {
    const base = existing ?? HealthComponent.make(DEFAULT_HEALTH)
    return HealthComponent.make({
      current: mutation.data.current ?? base.current,
      max: mutation.data.max ?? base.max,
      traumaActive: mutation.data.traumaActive ?? base.traumaActive,
      traumaEffect: mutation.data.traumaEffect ?? base.traumaEffect
    })
  }
}
// Note: current can be negative (overkill damage), so no lower bound
// Invariant current <= max enforced at application logic level, not schema

/**
 * Trauma state tracking for advanced injury rules
 */
export class TraumaStateComponent extends Schema.TaggedClass<TraumaStateComponent>()("TraumaState", {
  // Hardy trait: stabilization at -3 HP, death at -5 HP (default: -0, -3)
  stabilizationThreshold: Schema.Int.pipe(Schema.lessThanOrEqualTo(0)),
  deathThreshold: Schema.Int.pipe(Schema.lessThanOrEqualTo(-3)),

  // Permanent injuries from trauma (Surgeon trait can remove)
  permanentInjuries: Schema.Array(Schema.NonEmptyString),

  // Infection status (separate from trauma)
  infected: Schema.Boolean
}) {}
