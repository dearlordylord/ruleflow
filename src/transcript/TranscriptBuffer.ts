/**
 * TranscriptBuffer — groups phrase-level transcript segments into
 * higher-level action windows before interpretation.
 *
 * Heuristics:
 * - Long pauses end the current player action.
 * - Dice-result continuations ("that's a 17 plus 5") stay attached to
 *   the previous player declaration even across short pauses.
 * - Explicit action restarts ("I move 30 feet", "I withdraw") start a new
 *   buffered window even without a long pause.
 *
 * ⚡ Electric field: In the D&D project this becomes the phrase-to-turn
 * buffering layer between Whisper output and transcript interpretation.
 */
import { Context, Effect, Layer, Schema, SynchronizedRef } from "effect"

import { TranscriptSegment } from "./TranscriptSegment.js"

export class TranscriptBufferConfig extends Context.Tag("@game/TranscriptBufferConfig")<
  TranscriptBufferConfig,
  {
    /**
     * Phrase-level pause after which a new player utterance starts a new
     * buffered action unless it looks like a dice-result continuation.
     */
    readonly pauseThresholdMs: number
  }
>() {
  static readonly defaultLayer = Layer.succeed(TranscriptBufferConfig, {
    pauseThresholdMs: 1500
  })

  static readonly testLayer = (pauseThresholdMs: number) => Layer.succeed(TranscriptBufferConfig, { pauseThresholdMs })
}

export class BufferedTranscriptWindow extends Schema.Class<BufferedTranscriptWindow>("BufferedTranscriptWindow")({
  segments: Schema.NonEmptyArray(TranscriptSegment),
  committedAt: Schema.Date
}) {}

interface BufferState {
  readonly pending: ReadonlyArray<TranscriptSegment>
}

interface PushResult {
  readonly emitted: ReadonlyArray<BufferedTranscriptWindow>
  readonly pending: ReadonlyArray<TranscriptSegment>
}

export class TranscriptBuffer extends Context.Tag("@game/TranscriptBuffer")<
  TranscriptBuffer,
  {
    readonly push: (segment: TranscriptSegment) => Effect.Effect<PushResult>
    readonly flush: () => Effect.Effect<ReadonlyArray<BufferedTranscriptWindow>>
    readonly pending: () => Effect.Effect<ReadonlyArray<TranscriptSegment>>
    readonly reset: () => Effect.Effect<void>
  }
>() {
  static readonly layer = Layer.effect(
    TranscriptBuffer,
    Effect.gen(function*() {
      const config = yield* TranscriptBufferConfig
      const state = yield* SynchronizedRef.make<BufferState>({ pending: [] })

      const push = (segment: TranscriptSegment): Effect.Effect<PushResult> =>
        SynchronizedRef.modifyEffect(state, (current) =>
          Effect.sync(() => {
            const emitted: Array<BufferedTranscriptWindow> = []
            let pending = current.pending

            if (
              pending.length > 0
              && shouldFlushBeforeAppending(pending, segment, config.pauseThresholdMs)
            ) {
              emitted.push(makeWindow(pending, segment.timestamp))
              pending = []
            }

            pending = [...pending, segment]

            return [
              { emitted, pending },
              { pending }
            ] as const
          }))

      const flush = (): Effect.Effect<ReadonlyArray<BufferedTranscriptWindow>> =>
        SynchronizedRef.modify(state, (current) => {
          const emitted = current.pending.length > 0
            ? [makeWindow(current.pending, current.pending[current.pending.length - 1].timestamp)]
            : []

          return [emitted, { pending: [] }] as const
        })

      const pending = () => SynchronizedRef.get(state).pipe(Effect.map((current) => current.pending))

      const reset = () => SynchronizedRef.set(state, { pending: [] })

      return TranscriptBuffer.of({ flush, pending, push, reset })
    })
  )
}

function shouldFlushBeforeAppending(
  pending: ReadonlyArray<TranscriptSegment>,
  next: TranscriptSegment,
  pauseThresholdMs: number
): boolean {
  if (isDiceContinuation(next.text)) {
    return false
  }

  if (startsNewAction(next.text) && containsCommittedAction(pending)) {
    return true
  }

  const lastPending = pending[pending.length - 1]
  const pauseMs = next.timestamp.getTime() - lastPending.timestamp.getTime()
  if (pauseMs <= pauseThresholdMs) {
    return false
  }

  return true
}

function isDiceContinuation(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return /^(that'?s|thats|rolled|roll|natural|nat |plus |\d)/.test(normalized)
}

function startsNewAction(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return /^(i\s+)?(attack|move|withdraw|retreat|defend|take\s+defense|hold\s+my\s+ground)\b/.test(normalized)
}

function containsCommittedAction(segments: ReadonlyArray<TranscriptSegment>): boolean {
  return segments.some((segment) => startsNewAction(segment.text))
}

function makeWindow(
  segments: ReadonlyArray<TranscriptSegment>,
  committedAt: Date
): BufferedTranscriptWindow {
  const [first, ...rest] = segments
  return new BufferedTranscriptWindow({
    committedAt,
    segments: [first, ...rest]
  })
}
