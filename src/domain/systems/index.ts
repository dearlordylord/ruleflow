/**
 * System pipeline runner
 */
import { Chunk, Effect } from "effect"

import type { DomainError } from "../errors.js"
import { GameState } from "../infrastructure/GameState.js"
import type { Mutation } from "../mutations.js"
import type { System } from "./types.js"

export { combatToHitSystem, traumaSystem } from "./combat.js"
export { currencyValidationSystem } from "./currency.js"
export { attributeModifierSystem, encumbranceValidationSystem } from "./encumbrance.js"
export type { System } from "./types.js"

export const runSystemsPipeline = (
  systems: Array<System>,
  initialMutations: Chunk.Chunk<Mutation> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function*() {
    const state = yield* GameState

    return yield* Effect.reduce(
      systems,
      initialMutations,
      (accumulatedMutations, system) =>
        Effect.gen(function*() {
          const newMutations = yield* system(state, accumulatedMutations)
          return Chunk.appendAll(accumulatedMutations, newMutations)
        })
    )
  })
