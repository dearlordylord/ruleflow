/**
 * Event Log Service - persists domain events (source of truth)
 */
import { Context, Effect, Layer, Option, Schema, SynchronizedRef } from "effect"

import { EventLogEntryId } from "../entities.js"
import type { EventLogWriteError } from "../errors.js"
import { EventLogEntryNotFound } from "../errors.js"
import { DomainEvent } from "../events.js"

export class EventLogEntry extends Schema.Class<EventLogEntry>("EventLogEntry")({
  id: EventLogEntryId,
  timestamp: Schema.Date,
  event: DomainEvent
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
    Effect.gen(function*() {
      const store = yield* SynchronizedRef.make(
        new Map<EventLogEntryId, EventLogEntry>()
      )

      const append = (entry: EventLogEntry) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          // eslint-disable-next-line functional/immutable-data
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
