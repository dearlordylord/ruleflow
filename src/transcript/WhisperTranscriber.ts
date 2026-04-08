/**
 * WhisperTranscriber — audio/file input to phrase-level transcript segments.
 *
 * The live implementation will use a local Whisper backend. For now, tests
 * and demos can swap in deterministic prerecorded segment fixtures.
 *
 * ⚡ Electric field: In the D&D project this is the STT boundary whose output
 * feeds the transcript buffer before interpretation.
 */
import { Context, Effect, Layer, Schema } from "effect"

import { TranscriptInterpretationError } from "./errors.js"
import type { TranscriptSegment } from "./TranscriptSegment.js"

export class AudioTranscriptSource extends Schema.Class<AudioTranscriptSource>("AudioTranscriptSource")({
  audioFilePath: Schema.NonEmptyString
}) {}

export class WhisperTranscriber extends Context.Tag("@game/WhisperTranscriber")<
  WhisperTranscriber,
  {
    readonly transcribe: (
      source: AudioTranscriptSource
    ) => Effect.Effect<ReadonlyArray<TranscriptSegment>, TranscriptInterpretationError>
  }
>() {
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
