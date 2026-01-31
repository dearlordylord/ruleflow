/**
 * System pipeline runner
 */
import { Effect, Chunk } from "effect"
import type { System } from "./types.js"
import { Mutation } from "../mutations.js"
import { DomainError } from "../errors.js"
import { GameState } from "../infrastructure/GameState.js"

export type { System } from "./types.js"
export { combatToHitSystem, traumaSystem } from "./combat.js"
export { encumbranceValidationSystem, attributeModifierSystem } from "./encumbrance.js"
export { currencyValidationSystem } from "./currency.js"

export const runSystemsPipeline = (
  systems: Array<System>,
  initialMutations: Chunk.Chunk<Mutation> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function* () {
    const state = yield* GameState

    return yield* Effect.reduce(
      systems,
      initialMutations,
      (accumulatedMutations, system) =>
        Effect.gen(function* () {
          const newMutations = yield* system(state, accumulatedMutations)
          return Chunk.appendAll(accumulatedMutations, newMutations)
        })
    )
  })
