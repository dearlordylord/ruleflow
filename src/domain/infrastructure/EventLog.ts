/**
 * Event Log Service - persists all mutations
 */
import { Effect, Context, Layer, SynchronizedRef, Option, Schema } from "effect"
import { EventLogEntryId } from "../entities.js"
import { EventLogWriteError, EventLogEntryNotFound } from "../errors.js"
import { Mutation } from "../mutations.js"

export class EventLogEntry extends Schema.Class<EventLogEntry>("EventLogEntry")({
  id: EventLogEntryId,
  timestamp: Schema.Date,
  mutations: Schema.Array(Mutation)
}) {}

export class EventLog extends Context.Tag("@game/EventLog")<
  EventLog,
  {
    readonly append: (
      entry: EventLogEntry
    ) => Effect.Effect<void, EventLogWriteError>
    readonly read: (
      id: EventLogEntryId
    ) => Effect.Effect<EventLogEntry, EventLogEntryNotFound>
  }
>() {
  static readonly testLayer = Layer.effect(
    EventLog,
    Effect.gen(function* () {
      const store = yield* SynchronizedRef.make(
        new Map<EventLogEntryId, EventLogEntry>()
      )

      const append = (entry: EventLogEntry) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(entry.id, entry)
          return newMap
        })

      const read = (id: EventLogEntryId) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((map) =>
            Option.match(Option.fromNullable(map.get(id)), {
              onNone: () => Effect.fail(EventLogEntryNotFound.make({ id })),
              onSome: Effect.succeed
            })
          )
        )

      return EventLog.of({ append, read })
    })
  )
}
