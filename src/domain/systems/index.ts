/**
 * System pipeline runner
 */
import { Chunk, Effect } from "effect"

import type { DomainError } from "../errors.js"
import type { DomainEvent } from "../events.js"
import { GameState } from "../infrastructure/GameState.js"
import type { Mutation } from "../mutations.js"
import type { System } from "./types.js"

export { characterCreationSystem } from "./characterCreation.js"
export { combatToHitSystem, traumaSystem } from "./combat.js"
export { currencyTransferSystem } from "./currency.js"
export { attributeModifierSystem, encumbranceValidationSystem } from "./encumbrance.js"
export {
  containerDiscoverySystem,
  containerLockDiscoverySystem,
  containerSearchSystem,
  corpseCreationSystem,
  itemDiscoverySystem,
  itemDropSystem,
  itemLootingSystem,
  lootDistributionSystem
} from "./looting.js"
export type { System } from "./types.js"

export const runSystemsPipeline = (
  systems: Array<System>,
  events: Chunk.Chunk<DomainEvent> = Chunk.empty()
): Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, GameState> =>
  Effect.gen(function*() {
    const state = yield* GameState

    const mutations = yield* Effect.reduce(
      systems,
      Chunk.empty<Mutation>(),
      (accumulatedMutations, system) =>
        Effect.gen(function*() {
          const newMutations = yield* system(state, events, accumulatedMutations)
          return Chunk.appendAll(accumulatedMutations, newMutations)
        })
    )

    return mutations
  })
