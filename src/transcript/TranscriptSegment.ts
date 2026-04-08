/**
 * TranscriptSegment — a phrase-level unit of transcribed speech.
 *
 * Represents one segment from Whisper (or typed input simulating it).
 * Multiple segments may compose a single game action.
 *
 * ⚡ Electric field: In the D&D project, segments feed into the action token
 * interface — the transcript pipeline produces candidate events, and the
 * available actions module says whether each candidate is legal.
 */
import { Schema } from "effect"

export class TranscriptSegment extends Schema.Class<TranscriptSegment>("TranscriptSegment")({
  text: Schema.NonEmptyString,
  timestamp: Schema.Date,
  /** Optional speaker hint — "player", "dm", a character name, etc. */
  speakerHint: Schema.NullOr(Schema.NonEmptyString)
}) {}
