/**
 * Replayer - reconstructs state from EventLog by replaying events through systems
 */
import { Chunk, Context, Effect, Layer } from "effect"

import type { DomainError, EntityNotFound } from "../errors.js"
import type { AllSystemRequirements } from "../systems/index.js"
import { runSystemsPipeline, type System } from "../systems/index.js"
import type { EventLogEntry } from "./EventLog.js"
import { GameState } from "./GameState.js"

export class Replayer extends Context.Tag("@game/Replayer")<
  Replayer,
  {
    /**
     * Replays events through systems, applying resulting mutations to game state.
     * The requirements parameter (R) captures what services the systems need.
     */
    readonly replay: <R>(
      systems: Array<System<R>>,
      entries: Array<EventLogEntry>
    ) => Effect.Effect<void, Chunk.Chunk<DomainError> | EntityNotFound, R>
  }
>() {
  static readonly layer = Layer.effect(
    Replayer,
    Effect.gen(function*() {
      const gameState = yield* GameState

      const replay = <R>(systems: Array<System<R>>, entries: Array<EventLogEntry>) =>
        Effect.gen(function*() {
          for (const entry of entries) {
            // Run event through systems to generate mutations
            // Cast to AllSystemRequirements since we can't infer R at runtime
            const mutations = yield* runSystemsPipeline(
              systems as Array<System<AllSystemRequirements>>,
              Chunk.of(entry.event)
            )

            // Apply generated mutations to state
            yield* Effect.forEach(mutations, (m) => gameState.applyMutation(m))
          }
        }) as Effect.Effect<void, Chunk.Chunk<DomainError> | EntityNotFound, R>

      return Replayer.of({ replay })
    })
  )
}
