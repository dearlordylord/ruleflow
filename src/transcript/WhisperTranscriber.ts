/**
 * WhisperTranscriber — audio/file input to phrase-level transcript segments.
 *
 * The live implementation uses a local Whisper backend for recorded WAV files.
 * Tests and demos can swap in deterministic prerecorded segment fixtures.
 *
 * ⚡ Electric field: In the D&D project this is the STT boundary whose output
 * feeds the transcript buffer before interpretation.
 */
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { Context, Effect, Layer, Schema, SynchronizedRef } from "effect"

import { TranscriptInterpretationError } from "./errors.js"
import { TranscriptSegment } from "./TranscriptSegment.js"

const execFilePromise = promisify(execFile)

const LocalWhisperSegment = Schema.Struct({
  text: Schema.NonEmptyString,
  startMs: Schema.NonNegativeInt,
  endMs: Schema.NonNegativeInt
})

type LocalWhisperSegment = typeof LocalWhisperSegment.Type

const LocalWhisperResponse = Schema.Struct({
  segments: Schema.Array(LocalWhisperSegment)
})

type LocalWhisperResponse = typeof LocalWhisperResponse.Type

export class AudioTranscriptSource extends Schema.Class<AudioTranscriptSource>("AudioTranscriptSource")({
  audioFilePath: Schema.NonEmptyString
}) {}

export class LocalWhisperConfig extends Context.Tag("@game/LocalWhisperConfig")<
  LocalWhisperConfig,
  {
    readonly audioScriptPath: string
    readonly language: string
    readonly model: string
    readonly uvBinary: string
  }
>() {
  static readonly fromEnvLayer = Layer.succeed(LocalWhisperConfig, {
    audioScriptPath: fileURLToPath(new URL("../../scripts/transcribe_with_whisper.py", import.meta.url)),
    language: getEnv("WHISPER_LANGUAGE") ?? "en",
    model: getEnv("WHISPER_MODEL") ?? "tiny.en",
    uvBinary: getEnv("WHISPER_UV_BINARY") ?? "uv"
  })
}

export class LocalWhisperProcess extends Context.Tag("@game/LocalWhisperProcess")<
  LocalWhisperProcess,
  {
    readonly transcribe: (
      source: AudioTranscriptSource
    ) => Effect.Effect<LocalWhisperResponse, TranscriptInterpretationError>
  }
>() {
  static readonly liveLayer = Layer.effect(
    LocalWhisperProcess,
    Effect.gen(function*() {
      const config = yield* LocalWhisperConfig

      return LocalWhisperProcess.of({
        transcribe: (source) =>
          Effect.tryPromise({
            try: async () => {
              const { stdout } = await execFilePromise(
                config.uvBinary,
                [
                  "run",
                  "--quiet",
                  "--with",
                  "openai-whisper",
                  "--with",
                  "numpy",
                  "python",
                  config.audioScriptPath,
                  "--audio-file",
                  source.audioFilePath,
                  "--model",
                  config.model,
                  "--language",
                  config.language
                ],
                {
                  cwd: process.cwd(),
                  env: process.env
                }
              )

              const parsed: unknown = JSON.parse(stdout)
              return Schema.decodeUnknownSync(LocalWhisperResponse)(parsed)
            },
            catch: (error) =>
              new TranscriptInterpretationError({
                message: formatWhisperProcessError(error)
              })
          })
      })
    })
  )

  static readonly testLayer = (
    transcribe: (
      source: AudioTranscriptSource
    ) => Effect.Effect<LocalWhisperResponse, TranscriptInterpretationError>
  ) => Layer.succeed(LocalWhisperProcess, { transcribe })
}

export class WhisperTranscriber extends Context.Tag("@game/WhisperTranscriber")<
  WhisperTranscriber,
  {
    readonly transcribe: (
      source: AudioTranscriptSource
    ) => Effect.Effect<ReadonlyArray<TranscriptSegment>, TranscriptInterpretationError>
  }
>() {
  static readonly liveLayer = Layer.suspend(() =>
    makeCachedWhisperLayer(
      LocalWhisperProcess.liveLayer.pipe(
        Layer.provide(LocalWhisperConfig.fromEnvLayer)
      )
    )
  )

  static readonly testLayer = (
    transcribe: (
      source: AudioTranscriptSource
    ) => Effect.Effect<LocalWhisperResponse, TranscriptInterpretationError>
  ) => Layer.suspend(() => makeCachedWhisperLayer(LocalWhisperProcess.testLayer(transcribe)))

  static readonly fixtureLayer = (
    fixtures: Readonly<Record<string, ReadonlyArray<TranscriptSegment>>>
  ) =>
    Layer.succeed(WhisperTranscriber, {
      transcribe: (source) => {
        const match = fixtures[source.audioFilePath]
        return match
          ? Effect.succeed(match)
          : Effect.fail(
            new TranscriptInterpretationError({
              message: `No transcript fixture for audio source: ${source.audioFilePath}`
            })
          )
      }
    })
}

function decodeTranscriptSegments(
  segments: ReadonlyArray<LocalWhisperSegment>
): ReadonlyArray<TranscriptSegment> {
  return segments.flatMap(splitLocalWhisperSegment)
}

function formatWhisperProcessError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Local Whisper transcription failed"
  }

  const message = [error.message, getChildProcessStderr(error)].filter(Boolean).join(": ")
  return message || "Local Whisper transcription failed"
}

function getChildProcessStderr(error: Error): string | null {
  const maybeStderr = Reflect.get(error, "stderr")
  return typeof maybeStderr === "string" && maybeStderr.trim().length > 0 ? maybeStderr.trim() : null
}

function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : undefined
}

function splitLocalWhisperSegment(segment: LocalWhisperSegment): ReadonlyArray<TranscriptSegment> {
  const clauses = splitTranscriptClauses(segment.text)
  if (clauses.length <= 1) {
    return [
      new TranscriptSegment({
        text: segment.text,
        timestamp: new Date(segment.startMs),
        speakerHint: null
      })
    ]
  }

  const durationMs = Math.max(segment.endMs - segment.startMs, clauses.length)
  const totalTextLength = clauses.reduce((sum, clause) => sum + clause.length, 0)

  return clauses.map((clause, index) => {
    const precedingLength = clauses.slice(0, index).reduce((sum, previousClause) => sum + previousClause.length, 0)
    const offsetMs = totalTextLength === 0
      ? 0
      : Math.floor((precedingLength / totalTextLength) * durationMs)

    return new TranscriptSegment({
      text: clause,
      timestamp: new Date(segment.startMs + offsetMs),
      speakerHint: null
    })
  })
}

function splitTranscriptClauses(text: string): ReadonlyArray<string> {
  return text
    .split(/(?<=[.!?])\s+(?=(?:i\s+)?(?:attack|move|withdraw|retreat|defend|take\s+defense|hold\s+my\s+ground)\b)/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)
}

function makeCachedWhisperLayer(
  processLayer: Layer.Layer<LocalWhisperProcess, TranscriptInterpretationError, never>
): Layer.Layer<WhisperTranscriber, TranscriptInterpretationError, never> {
  return Layer.effect(
    WhisperTranscriber,
    Effect.gen(function*() {
      const localWhisperProcess = yield* LocalWhisperProcess
      const cache = yield* SynchronizedRef.make(new Map<string, ReadonlyArray<TranscriptSegment>>())

      return WhisperTranscriber.of({
        transcribe: (source) =>
          SynchronizedRef.modifyEffect(cache, (entries) => {
            const cached = entries.get(source.audioFilePath)
            if (cached) {
              return Effect.succeed([cached, entries] as const)
            }

            return localWhisperProcess.transcribe(source).pipe(
              Effect.map((response) => decodeTranscriptSegments(response.segments)),
              Effect.map((decodedSegments) => {
                const nextEntries = new Map(entries)
                nextEntries.set(source.audioFilePath, decodedSegments)
                return [decodedSegments, nextEntries] as const
              })
            )
          })
      })
    })
  ).pipe(Layer.provide(processLayer))
}
