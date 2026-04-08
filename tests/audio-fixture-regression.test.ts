import { readFileSync } from "node:fs"

import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"

import type { TranscriptSegment } from "../src/transcript/index.js"
import {
  postProcessWhisperSegments,
  RawWhisperSegment,
  TranscriptBuffer,
  TranscriptBufferConfig
} from "../src/transcript/index.js"

const FixtureExpectation = Schema.Struct({
  file: Schema.NonEmptyString,
  rawSegments: Schema.NonEmptyArray(Schema.NonEmptyString),
  postProcessedSegments: Schema.NonEmptyArray(Schema.NonEmptyString),
  bufferedWindows: Schema.NonEmptyArray(Schema.NonEmptyArray(Schema.NonEmptyString))
})

const FixtureExpectationsDocument = Schema.Struct({
  fixtures: Schema.NonEmptyArray(FixtureExpectation)
})

type FixtureExpectation = typeof FixtureExpectation.Type

const expectations = Schema.decodeUnknownSync(FixtureExpectationsDocument)(
  JSON.parse(readFileSync(new URL("../fixtures/audio/expectations.json", import.meta.url), "utf8")) as unknown
)

function makeRawSegments(texts: ReadonlyArray<string>): ReadonlyArray<RawWhisperSegment> {
  return texts.map((text, index) =>
    new RawWhisperSegment({
      text,
      startMs: index * 4000,
      endMs: index * 4000 + 3000
    })
  )
}

function collectBufferedWindows(
  segments: ReadonlyArray<TranscriptSegment>
): Effect.Effect<ReadonlyArray<ReadonlyArray<string>>, never, TranscriptBuffer> {
  return Effect.gen(function*() {
    const buffer = yield* TranscriptBuffer
    const windows: Array<ReadonlyArray<string>> = []

    for (const segment of segments) {
      const pushed = yield* buffer.push(segment)
      windows.push(...pushed.emitted.map((window) => window.segments.map((item) => item.text)))
    }

    const flushed = yield* buffer.flush()
    windows.push(...flushed.map((window) => window.segments.map((item) => item.text)))

    return windows
  })
}

describe("audio fixture regression expectations", () => {
  for (const fixture of expectations.fixtures) {
    it.effect(`matches post-processing and buffering for ${fixture.file}`, () =>
      Effect.gen(function*() {
        const postProcessed = postProcessWhisperSegments(makeRawSegments(fixture.rawSegments))
        const bufferedWindows = yield* collectBufferedWindows(postProcessed)

        expect(postProcessed.map((segment) => segment.text)).toEqual(fixture.postProcessedSegments)
        expect(bufferedWindows).toEqual(fixture.bufferedWindows)
      }).pipe(
        Effect.provide(
          TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.defaultLayer))
        )
      ))
  }
})
