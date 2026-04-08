/**
 * Transcript pipeline errors
 */
import { Schema } from "effect"

export class TranscriptInterpretationError extends Schema.TaggedError<TranscriptInterpretationError>()(
  "TranscriptInterpretationError",
  { message: Schema.NonEmptyString }
) {}
