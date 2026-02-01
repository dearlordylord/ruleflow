/**
 * Concentration System - Mystery concentration breaking mechanics
 */
import { Chunk, Effect } from "effect"

import { ConcentrationBroken } from "../combat/concentrationEvents.js"
import { hasCondition } from "../combat/conditions.js"
import { RemoveConditionMutation } from "../combat/mutations.js"
import { getComponent } from "../entity.js"
import type { System } from "./types.js"

/**
 * Processes concentration checks when damage is taken
 * - Suppression save DC 10 + damage
 * - If failed: break concentration, remove "Concentrating" condition
 * - If mystery not yet triggered: no concentration points spent
 *
 * TODO: Integrate with mystery system for concentration points
 * TODO: Implement save rolling
 */
export const concentrationSystem: System = (state, events, accumulatedMutations) =>
  Effect.gen(function*() {
    const damageMutations = Chunk.filter(
      accumulatedMutations,
      (m) => m._tag === "DealDamage"
    )

    const mutations: Array<typeof RemoveConditionMutation.Type> = []
    const _concentrationBreaks: Array<typeof ConcentrationBroken.Type> = []

    for (const damage of damageMutations) {
      const entity = yield* state.getEntity(damage.entityId).pipe(
        Effect.orElseSucceed(() => null)
      )

      if (!entity) continue

      const conditions = getComponent(entity, "Conditions")
      if (!conditions || !hasCondition(conditions.conditions, "Concentrating")) continue

      const mysteryCasting = getComponent(entity, "MysteryCasting")

      // TODO: Roll Suppression save (DC 10 + damage)
      // For now, assume concentration breaks (placeholder)
      const saveFailed = true // TODO: implement save rolling

      if (saveFailed) {
        // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
        _concentrationBreaks.push(
          ConcentrationBroken.make({
            entityId: damage.entityId,
            reason: "DamageFailed",
            damageTaken: damage.amount,
            mysteryTriggered: mysteryCasting?.resolved ?? false
          })
        )

        // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
        mutations.push(
          RemoveConditionMutation.make({
            entityId: damage.entityId,
            conditionType: "Concentrating"
          })
        )

        // TODO: If !mysteryTriggered, don't spend concentration points
        // This requires mystery system integration
      }
    }

    // Emit concentration broken events (these trigger other systems)
    // For now, just return mutations
    return Chunk.fromIterable(mutations)
  })
