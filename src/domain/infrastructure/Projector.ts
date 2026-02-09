/**
 * Projector - rebuilds state from ObservationLog by replaying selected events through systems.
 *
 * projectLatest evaluates all candidates by running the systems pipeline independently
 * for each one (read-only against current state), scoring by warning burden then confidence,
 * and applying only the winning candidate's mutations.
 */
import { Chunk, Context, Effect, Layer } from "effect"

import type { DomainError, EntityNotFound, ObservationLogWriteError } from "../errors.js"
import type { Mutation } from "../mutations.js"
import { type AllSystemRequirements, runAllSystems } from "../systems/index.js"
import type { ConsistencyWarning } from "../warnings.js"
import { GameState } from "./GameState.js"
import { ObservationEntry, ObservationLog } from "./ObservationLog.js"
import { ReadModelStore } from "./ReadModelStore.js"

/**
 * Score a candidate by warning burden and confidence.
 * Lower burden is better; for ties, higher confidence wins.
 */
const scoreCandidate = (
  warnings: Chunk.Chunk<ConsistencyWarning>,
  confidence: number
): { readonly burden: number; readonly confidence: number } => ({
  burden: Chunk.reduce(warnings, 0, (acc, w) => acc + w.severity),
  confidence
})

export class Projector extends Context.Tag("@game/Projector")<
  Projector,
  {
    readonly replayAll: () => Effect.Effect<
      void,
      Chunk.Chunk<DomainError> | EntityNotFound,
      AllSystemRequirements
    >
    readonly projectLatest: (
      observation: ObservationEntry
    ) => Effect.Effect<
      void,
      Chunk.Chunk<DomainError> | EntityNotFound | ObservationLogWriteError,
      AllSystemRequirements
    >
  }
>() {
  static readonly layer = Layer.effect(
    Projector,
    Effect.gen(function*() {
      const observationLog = yield* ObservationLog
      const readModelStore = yield* ReadModelStore
      const gameState = yield* GameState

      const replayAll = () =>
        Effect.gen(function*() {
          // 1. Clear current state
          yield* readModelStore.clear()

          // 2. Read all observation entries in insertion order
          const entries = yield* observationLog.readAll()

          // 3. Replay each entry's selected event through all systems
          for (const entry of entries) {
            // Skip entries with no selected event
            if (entry.selectedIndex === null) {
              continue
            }

            const event = entry.candidates[entry.selectedIndex].event

            // Run event through all systems
            const { mutations } = yield* runAllSystems(Chunk.of(event))

            // Apply resulting mutations to state
            yield* Effect.forEach(mutations, (m) => gameState.applyMutation(m))
          }
        }) as Effect.Effect<void, Chunk.Chunk<DomainError> | EntityNotFound, AllSystemRequirements>

      const projectLatest = (observation: ObservationEntry) =>
        Effect.gen(function*() {
          // 1. Evaluate each candidate independently against current (unchanged) state.
          //    Pipeline is read-only: systems read via state.getEntity() but produce
          //    mutations without applying them. Each evaluation is independent.
          const evaluated = yield* Effect.forEach(
            observation.candidates,
            (candidate) =>
              Effect.map(
                runAllSystems(Chunk.of(candidate.event)),
                (result) => ({
                  mutations: result.mutations,
                  score: scoreCandidate(result.warnings, candidate.confidence)
                })
              )
          )

          // 2. Select the best candidate: lowest burden, then highest confidence.
          let bestIndex = 0
          let bestScore = evaluated[0].score
          let bestMutations: Chunk.Chunk<Mutation> = evaluated[0].mutations
          for (let i = 1; i < evaluated.length; i++) {
            const current = evaluated[i]
            if (
              current.score.burden < bestScore.burden
              || (current.score.burden === bestScore.burden
                && current.score.confidence > bestScore.confidence)
            ) {
              bestIndex = i
              bestScore = current.score
              bestMutations = current.mutations
            }
          }

          // 3. Record the selected index on the observation and append to log
          const withSelection = new ObservationEntry({
            ...observation,
            selectedIndex: bestIndex
          })
          yield* observationLog.append(withSelection)

          // 4. Apply the winning candidate's mutations to state
          yield* Effect.forEach(bestMutations, (m) => gameState.applyMutation(m))
        }) as Effect.Effect<
          void,
          Chunk.Chunk<DomainError> | EntityNotFound | ObservationLogWriteError,
          AllSystemRequirements
        >

      return Projector.of({ replayAll, projectLatest })
    })
  )
}
