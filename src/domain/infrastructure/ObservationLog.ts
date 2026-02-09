/**
 * ObservationLog types and service - tracks probabilistic event observations
 */
import { Context, Effect, Layer, Option, Schema, SynchronizedRef } from "effect"

import { ObservationEntryId } from "../entities.js"
import type { ObservationLogWriteError } from "../errors.js"
import { ObservationEntryNotFound } from "../errors.js"
import { DomainEvent } from "../events.js"

export class ObservationEntry extends Schema.Class<ObservationEntry>("ObservationEntry")({
  id: ObservationEntryId,
  timestamp: Schema.Date,
  candidates: Schema.NonEmptyArray(Schema.Struct({
    event: DomainEvent,
    confidence: Schema.Number
  })),
  selectedIndex: Schema.NullOr(Schema.NonNegativeInt)
}) {}

export class ObservationLog extends Context.Tag("@game/ObservationLog")<
  ObservationLog,
  {
    readonly append: (
      entry: ObservationEntry
    ) => Effect.Effect<void, ObservationLogWriteError>
    readonly read: (
      id: ObservationEntryId
    ) => Effect.Effect<ObservationEntry, ObservationEntryNotFound>
    readonly readAll: () => Effect.Effect<ReadonlyArray<ObservationEntry>>
    readonly updateSelection: (
      id: ObservationEntryId,
      selectedIndex: number | null
    ) => Effect.Effect<void, ObservationEntryNotFound>
  }
>() {
  static readonly testLayer = Layer.effect(
    ObservationLog,
    Effect.gen(function*() {
      const store = yield* SynchronizedRef.make<Array<ObservationEntry>>([])

      const append = (entry: ObservationEntry) =>
        SynchronizedRef.update(store, (entries) => [
          ...entries,
          entry
        ])

      const read = (id: ObservationEntryId) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((entries) =>
            Option.match(Option.fromNullable(entries.find((e) => e.id === id)), {
              onNone: () => Effect.fail(ObservationEntryNotFound.make({ id })),
              onSome: Effect.succeed
            })
          )
        )

      const readAll = () => SynchronizedRef.get(store)

      const updateSelection = (id: ObservationEntryId, selectedIndex: number | null) =>
        SynchronizedRef.updateEffect(store, (entries) => {
          const idx = entries.findIndex((e) => e.id === id)
          if (idx === -1) {
            return Effect.fail(ObservationEntryNotFound.make({ id }))
          }
          const updated = [...entries]
          // eslint-disable-next-line functional/immutable-data -- local mutation, converted to new array on return
          updated[idx] = new ObservationEntry({
            ...entries[idx],
            selectedIndex
          })
          return Effect.succeed(updated)
        })

      return ObservationLog.of({ append, read, readAll, updateSelection })
    })
  )
}
