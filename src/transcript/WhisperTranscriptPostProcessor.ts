import { Schema } from "effect"

import { TranscriptSegment } from "./TranscriptSegment.js"

export class RawWhisperSegment extends Schema.Class<RawWhisperSegment>("RawWhisperSegment")({
  text: Schema.NonEmptyString,
  startMs: Schema.NonNegativeInt,
  endMs: Schema.NonNegativeInt
}) {}

export function postProcessWhisperSegments(
  segments: ReadonlyArray<RawWhisperSegment>
): ReadonlyArray<TranscriptSegment> {
  return segments.flatMap(splitRawWhisperSegment)
}

function splitRawWhisperSegment(segment: RawWhisperSegment): ReadonlyArray<TranscriptSegment> {
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
  const normalized = text
    .replace(
      /,\s+then\s+(?=(?:i\s+)?(?:attack|move|withdraw|retreat|defend|take\s+defense|hold\s+my\s+ground)\b)/gi,
      ". "
    )

  return normalized
    .split(/(?<=[.!?])\s+(?=(?:i\s+)?(?:attack|move|withdraw|retreat|defend|take\s+defense|hold\s+my\s+ground)\b)/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)
}
