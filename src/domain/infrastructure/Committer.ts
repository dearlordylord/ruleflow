/**
 * Committer - atomic transaction: EventLog write → ReadModel update
 */
import { Effect, Context, Layer, Chunk, Exit } from "effect"
import { EventLogEntryId } from "../entities.js"
import { EventLogWriteError, EntityNotFound } from "../errors.js"
import { Mutation } from "../mutations.js"
import { EventLog, EventLogEntry } from "./EventLog.js"
import { GameState } from "./GameState.js"

export class Committer extends Context.Tag("@game/Committer")<
  Committer,
  {
    readonly commit: (
      mutations: Chunk.Chunk<Mutation>
    ) => Effect.Effect<EventLogEntry, EventLogWriteError | EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    Committer,
    Effect.gen(function* () {
      const eventLog = yield* EventLog
      const state = yield* GameState

      const commit = (mutations: Chunk.Chunk<Mutation>) =>
        Effect.acquireUseRelease(
          Effect.sync(() =>
            EventLogEntry.make({
              id: EventLogEntryId.make(crypto.randomUUID()),
              timestamp: new Date(),
              mutations: Array.from(mutations)
            })
          ),
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
