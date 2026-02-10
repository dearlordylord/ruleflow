/**
 * Dashboard-only validation system that emits ConsistencyWarnings for the demo.
 * Checks for anomalies in AttackPerformed events and CurrencyTransferred events.
 */
import { Chunk, Effect } from "effect"

import { SystemName } from "../../domain/entities.js"
import { ConsistencyWarning, ZeroToOne } from "../../domain/warnings.js"
import type { System } from "../../domain/systems/types.js"

/**
 * validationSystem: dashboard-only system that detects "suspicious" observations
 * and emits warnings. Used to demo how warnings affect candidate scoring.
 *
 * Checks:
 * - AttackPerformed with roll <= 3: "roll implausibly low" (severity 0.80)
 * - CurrencyTransferred with silver >= 40: "implausible loot amount" (severity 0.60)
 */
export const validationSystem: System<never> = (_state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const warnings: Array<ConsistencyWarning> = []

    for (const event of events) {
      if (event._tag === "AttackPerformed" && event.attackRoll <= 3) {
        warnings.push(new ConsistencyWarning({
          systemName: SystemName.make("dashboardValidation"),
          problem: `roll implausibly low (${event.attackRoll})`,
          severity: ZeroToOne.make(0.8),
          affectedEntities: [event.attackerId, event.targetId]
        }))
      }

      if (event._tag === "CurrencyTransferred" && event.silver >= 40) {
        warnings.push(new ConsistencyWarning({
          systemName: SystemName.make("dashboardValidation"),
          problem: `implausible loot amount (${event.silver} silver)`,
          severity: ZeroToOne.make(0.6),
          affectedEntities: [event.fromEntityId, event.toEntityId]
        }))
      }
    }

    return {
      mutations: Chunk.empty(),
      warnings: Chunk.fromIterable(warnings)
    }
  })
