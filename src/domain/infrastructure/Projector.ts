/**
 * Projector - rebuilds state from ObservationLog by replaying selected events through systems
 */
import { Chunk, Context, Effect, Layer } from "effect"

import type { DomainError, EntityNotFound, ObservationLogWriteError } from "../errors.js"
import { type AllSystemRequirements, runAllSystems } from "../systems/index.js"
import { GameState } from "./GameState.js"
import { type ObservationEntry, ObservationLog } from "./ObservationLog.js"
import { ReadModelStore } from "./ReadModelStore.js"

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
          // 1. Append observation to log
          yield* observationLog.append(observation)

          // 2. If no selected index, nothing to process
          if (observation.selectedIndex === null) {
            return
          }

          // 3. Extract event from selected candidate
          const event = observation.candidates[observation.selectedIndex].event

          // 4. Run event through all systems
          const { mutations } = yield* runAllSystems(Chunk.of(event))

          // 5. Apply resulting mutations to state
          yield* Effect.forEach(mutations, (m) => gameState.applyMutation(m))
        }) as Effect.Effect<
          void,
          Chunk.Chunk<DomainError> | EntityNotFound | ObservationLogWriteError,
          AllSystemRequirements
        >

      return Projector.of({ replayAll, projectLatest })
    })
  )
}
