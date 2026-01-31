/**
 * Committer - atomic transaction: EventLog write → ReadModel update
 */
import type { Chunk } from "effect"
import { Context, Effect, Exit, Layer } from "effect"

import { EventLogEntryId } from "../entities.js"
import type { EntityNotFound, EventLogWriteError } from "../errors.js"
import type { DomainEvent } from "../events.js"
import type { Mutation } from "../mutations.js"
import { IdGenerator } from "../services/IdGenerator.js"
import { EventLog, EventLogEntry } from "./EventLog.js"
import { GameState } from "./GameState.js"

export class Committer extends Context.Tag("@game/Committer")<
  Committer,
  {
    readonly commit: (
      event: DomainEvent,
      mutations: Chunk.Chunk<Mutation>
    ) => Effect.Effect<EventLogEntry, EventLogWriteError | EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    Committer,
    Effect.gen(function*() {
      const eventLog = yield* EventLog
      const state = yield* GameState
      const idGen = yield* IdGenerator

      const commit = (event: DomainEvent, mutations: Chunk.Chunk<Mutation>) =>
        Effect.acquireUseRelease(
          Effect.gen(function*() {
            const id = yield* idGen.generate()
            return EventLogEntry.make({
              id: EventLogEntryId.make(id),
              timestamp: new Date(),
              event
            })
          }),
          (entry) =>
            eventLog.append(entry).pipe(
              Effect.zipRight(
                Effect.forEach(mutations, (m) => state.applyMutation(m))
              ),
              Effect.as(entry)
            ),
          (entry, exit) =>
            Exit.isFailure(exit)
              ? Effect.logError(`Failed to commit ${entry.id}`)
              : Effect.void
        )

      return Committer.of({ commit })
    })
  )
}
