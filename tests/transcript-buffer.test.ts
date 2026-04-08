import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"

import { TranscriptBuffer, TranscriptBufferConfig, TranscriptSegment } from "../src/transcript/index.js"

function seg(
  text: string,
  iso: string,
  speakerHint: string | null = "player"
): TranscriptSegment {
  return new TranscriptSegment({
    text,
    timestamp: new Date(iso),
    speakerHint
  })
}

describe("TranscriptBuffer", () => {
  it.effect("keeps short-pause continuation segments in the same pending action", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer

      const first = yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const second = yield* buffer.push(seg("that's a 17 plus 5", "2026-04-08T12:00:00.800Z"))
      const flushed = yield* buffer.flush()

      expect(first.emitted).toHaveLength(0)
      expect(second.emitted).toHaveLength(0)
      expect(flushed).toHaveLength(1)
      expect(flushed[0].segments.map((segment) => segment.text)).toEqual([
        "I attack the goblin",
        "that's a 17 plus 5"
      ])
    }).pipe(Effect.provide(TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.defaultLayer)))))

  it.effect("flushes immediately when a new action starts without a long pause", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer

      yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const second = yield* buffer.push(seg("I move 30 feet", "2026-04-08T12:00:00.900Z"))
      const pending = yield* buffer.pending()

      expect(second.emitted).toHaveLength(1)
      expect(second.emitted[0].segments.map((segment) => segment.text)).toEqual(["I attack the goblin"])
      expect(pending.map((segment) => segment.text)).toEqual(["I move 30 feet"])
    }).pipe(Effect.provide(TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.defaultLayer)))))

  it.effect("flushes on a long pause before a new action", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer

      yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const second = yield* buffer.push(seg("I move 30 feet", "2026-04-08T12:00:03.000Z"))
      const pending = yield* buffer.pending()

      expect(second.emitted).toHaveLength(1)
      expect(second.emitted[0].segments.map((segment) => segment.text)).toEqual([
        "I attack the goblin"
      ])
      expect(pending.map((segment) => segment.text)).toEqual(["I move 30 feet"])
    }).pipe(
      Effect.provide(
        TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.testLayer(1000)))
      )
    ))

  it.effect("does not special-case speaker identity while buffering", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer

      yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const dmSpeech = yield* buffer.push(seg("that hits", "2026-04-08T12:00:01.000Z", "dm"))
      const flushed = yield* buffer.flush()

      expect(dmSpeech.emitted).toHaveLength(0)
      expect(flushed).toHaveLength(1)
      expect(flushed[0].segments.map((segment) => segment.text)).toEqual([
        "I attack the goblin",
        "that hits"
      ])
    }).pipe(Effect.provide(TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.defaultLayer)))))
})
