import type { Chunk } from "effect"
import { Context, Effect, Layer, Schema, SynchronizedRef } from "effect"

import type { DomainError, EntityNotFound, ObservationLogWriteError } from "../domain/errors.js"
import type { GameState } from "../domain/infrastructure/GameState.js"
import { ObservationEntry, ObservationLog } from "../domain/infrastructure/ObservationLog.js"
import type { AllSystemRequirements } from "../domain/systems/index.js"
import type { TranscriptInterpretationError } from "./errors.js"
import type { InterpretationContext } from "./TranscriptInterpreter.js"
import { TranscriptPipeline } from "./TranscriptPipeline.js"
import { TranscriptSegment } from "./TranscriptSegment.js"

export class TranscriptStreamConfig extends Context.Tag("@game/TranscriptStreamConfig")<
  TranscriptStreamConfig,
  {
    readonly maxTailWindows: number
  }
>() {
  static readonly defaultLayer = Layer.succeed(TranscriptStreamConfig, {
    maxTailWindows: 2
  })

  static readonly testLayer = (maxTailWindows: number) => Layer.succeed(TranscriptStreamConfig, { maxTailWindows })
}

export class TailTranscriptObservation extends Schema.Class<TailTranscriptObservation>("TailTranscriptObservation")({
  observation: ObservationEntry,
  segments: Schema.NonEmptyArray(TranscriptSegment)
}) {}

export class TranscriptStreamState extends Schema.Class<TranscriptStreamState>("TranscriptStreamState")({
  committed: Schema.Array(ObservationEntry),
  tail: Schema.Array(TailTranscriptObservation)
}) {}

interface TailState {
  readonly tail: ReadonlyArray<TailTranscriptObservation>
}

export class TranscriptStream extends Context.Tag("@game/TranscriptStream")<
  TranscriptStream,
  {
    readonly pushWindow: (
      segments: ReadonlyArray<TranscriptSegment>,
      context: InterpretationContext
    ) => Effect.Effect<
      TranscriptStreamState,
      TranscriptInterpretationError | ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
      GameState | AllSystemRequirements
    >
    readonly flush: () => Effect.Effect<
      TranscriptStreamState,
      ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
      GameState | AllSystemRequirements
    >
    readonly state: () => Effect.Effect<TranscriptStreamState>
    readonly reset: () => Effect.Effect<void>
  }
>() {
  static readonly layer = Layer.effect(
    TranscriptStream,
    Effect.gen(function*() {
      const config = yield* TranscriptStreamConfig
      const pipeline = yield* TranscriptPipeline
      const observationLog = yield* ObservationLog
      const stateRef = yield* SynchronizedRef.make<TailState>({ tail: [] })

      const snapshot = (): Effect.Effect<TranscriptStreamState> =>
        Effect.gen(function*() {
          const committed = yield* observationLog.readAll()
          const current = yield* SynchronizedRef.get(stateRef)

          return new TranscriptStreamState({
            committed,
            tail: [...current.tail]
          })
        })

      const commitOldest = (
        tail: ReadonlyArray<TailTranscriptObservation>
      ): Effect.Effect<
        ReadonlyArray<TailTranscriptObservation>,
        ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
        GameState | AllSystemRequirements
      > =>
        Effect.gen(function*() {
          if (tail.length === 0) {
            return tail
          }

          const [oldest, ...rest] = tail
          yield* pipeline.commit(oldest.observation)
          return rest
        })

      const pushWindow = (
        segments: ReadonlyArray<TranscriptSegment>,
        context: InterpretationContext
      ): Effect.Effect<
        TranscriptStreamState,
        TranscriptInterpretationError | ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
        GameState | AllSystemRequirements
      > =>
        Effect.gen(function*() {
          const result = yield* pipeline.evaluate(segments, context)
          if (result.observation === null) {
            return yield* snapshot()
          }
          const observation = result.observation

          yield* SynchronizedRef.updateEffect(stateRef, (current) =>
            Effect.gen(function*() {
              const [first, ...rest] = segments
              const nextTail = [
                ...current.tail,
                new TailTranscriptObservation({
                  observation: new ObservationEntry({
                    id: observation.id,
                    timestamp: observation.timestamp,
                    candidates: observation.candidates,
                    selectedIndex: 0
                  }),
                  segments: [first, ...rest]
                })
              ]

              let trimmedTail: ReadonlyArray<TailTranscriptObservation> = nextTail
              while (trimmedTail.length > config.maxTailWindows) {
                trimmedTail = yield* commitOldest(trimmedTail)
              }

              return { tail: trimmedTail }
            }))

          return yield* snapshot()
        })

      const flush = (): Effect.Effect<
        TranscriptStreamState,
        ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
        GameState | AllSystemRequirements
      > =>
        Effect.gen(function*() {
          const current = yield* SynchronizedRef.get(stateRef)
          let remaining = current.tail
          while (remaining.length > 0) {
            remaining = yield* commitOldest(remaining)
          }

          yield* SynchronizedRef.set(stateRef, { tail: [] })
          return yield* snapshot()
        })

      const reset = () => SynchronizedRef.set(stateRef, { tail: [] })

      return TranscriptStream.of({
        flush,
        pushWindow,
        reset,
        state: snapshot
      })
    })
  )
}
