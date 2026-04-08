import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { AudioTranscriptSource, WhisperTranscriber } from "../src/transcript/WhisperTranscriber.js"

describe("WhisperTranscriber.liveLayer", () => {
  it.effect("maps local whisper segments into transcript segments", () => {
    let callCount = 0

    return Effect.gen(function*() {
      const transcriber = yield* WhisperTranscriber
      const segments = yield* transcriber.transcribe(
        new AudioTranscriptSource({
          audioFilePath: "fixtures/attack-goblin.wav"
        })
      )

      expect(callCount).toBe(1)
      expect(segments).toHaveLength(2)
      expect(segments[0].text).toBe("I attack the goblin")
      expect(segments[0].speakerHint).toBe(null)
      expect(segments[0].timestamp.toISOString()).toBe("1970-01-01T00:00:00.000Z")
      expect(segments[1].timestamp.toISOString()).toBe("1970-01-01T00:00:00.700Z")
    }).pipe(Effect.provide(WhisperTranscriber.testLayer(() => {
      callCount += 1
      return Effect.succeed({
        segments: [
          { text: "I attack the goblin", startMs: 0, endMs: 600 },
          { text: "that's a 17 plus 5", startMs: 700, endMs: 1400 }
        ]
      })
    })))
  })

  it.effect("splits a single whisper segment when it contains a second action clause", () =>
    Effect.gen(function*() {
      const transcriber = yield* WhisperTranscriber
      const segments = yield* transcriber.transcribe(
        new AudioTranscriptSource({
          audioFilePath: "fixtures/audio/attack-then-move.wav"
        })
      )

      expect(segments).toHaveLength(2)
      expect(segments[0].text).toBe("I attack the goblin.")
      expect(segments[1].text).toBe("I move 30 feet.")
      expect(segments[0].timestamp.getTime()).toBe(0)
      expect(segments[1].timestamp.getTime()).toBeGreaterThan(0)
      expect(segments[1].timestamp.getTime()).toBeLessThanOrEqual(2400)
    }).pipe(Effect.provide(WhisperTranscriber.testLayer(() =>
      Effect.succeed({
        segments: [{ text: "I attack the goblin. I move 30 feet.", startMs: 0, endMs: 2400 }]
      })
    ))))

  it.effect("caches repeated transcriptions for the same audio file", () => {
    let callCount = 0

    return Effect.gen(function*() {
      const transcriber = yield* WhisperTranscriber
      const source = new AudioTranscriptSource({
        audioFilePath: "fixtures/attack-goblin.wav"
      })

      const first = yield* transcriber.transcribe(source)
      const second = yield* transcriber.transcribe(source)

      expect(callCount).toBe(1)
      expect(first).toHaveLength(1)
      expect(second).toHaveLength(1)
      expect(first[0].text).toBe(second[0].text)
    }).pipe(Effect.provide(WhisperTranscriber.testLayer(() => {
      callCount += 1
      return Effect.succeed({
        segments: [{ text: "I move 30 feet", startMs: 0, endMs: 900 }]
      })
    })))
  })
})
