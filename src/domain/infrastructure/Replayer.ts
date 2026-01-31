/**
 * Replayer - reconstructs state from EventLog by replaying events through systems
 */
import { Chunk, Context, Effect, Layer } from "effect"

import type { DomainError, EntityNotFound } from "../errors.js"
import { runSystemsPipeline, type System } from "../systems/index.js"
import type { EventLogEntry } from "./EventLog.js"
import { GameState } from "./GameState.js"

export class Replayer extends Context.Tag("@game/Replayer")<
  Replayer,
  {
    readonly replay: (
      systems: Array<System>,
      entries: Array<EventLogEntry>
    ) => Effect.Effect<void, Chunk.Chunk<DomainError> | EntityNotFound, any>
  }
>() {
  static readonly layer = Layer.effect(
    Replayer,
    Effect.gen(function*() {
      const gameState = yield* GameState

      const replay = (systems: Array<System>, entries: Array<EventLogEntry>) =>
        Effect.gen(function*() {
          for (const entry of entries) {
            // Run event through systems to generate mutations
            const mutations = yield* runSystemsPipeline(
              systems,
              Chunk.of(entry.event)
            )

            // Apply generated mutations to state
            yield* Effect.forEach(mutations, (m) => gameState.applyMutation(m))
          }
        })

      return Replayer.of({ replay })
    })
  )
}
