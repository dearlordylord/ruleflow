/**
 * TranscriptPipeline — orchestrates the transcript-to-state-change flow:
 *
 *   segments → TranscriptInterpreter → ObservationEntry → Projector.projectLatest()
 *
 * The pipeline bridges the transcript layer and the event-sourcing infrastructure.
 * It converts interpreter output (CandidateInterpretation[]) into the observation
 * format that Projector already knows how to score and apply.
 *
 * ⚡ Electric field: In the D&D project, the pipeline would validate candidates
 * against XState guards before creating the ObservationEntry. Illegal candidates
 * would be filtered or flagged, not silently scored. Here, Hellenvald's consistency-
 * warning scoring handles "soft" illegality — a candidate that triggers warnings
 * gets a higher burden and loses to cleaner candidates.
 */
import type { Chunk } from "effect"
import { Context, Effect, Layer } from "effect"

import { ObservationEntryId } from "../domain/entities.js"
import type { DomainError, EntityNotFound, ObservationLogWriteError } from "../domain/errors.js"
import type { GameState } from "../domain/infrastructure/GameState.js"
import { ObservationEntry } from "../domain/infrastructure/ObservationLog.js"
import { Projector } from "../domain/infrastructure/Projector.js"
import type { AllSystemRequirements } from "../domain/systems/index.js"
import type { TranscriptInterpretationError } from "./errors.js"
import type { InterpretationContext } from "./TranscriptInterpreter.js"
import { TranscriptInterpreter } from "./TranscriptInterpreter.js"
import type { TranscriptSegment } from "./TranscriptSegment.js"

// ---------------------------------------------------------------------------
// Pipeline result
// ---------------------------------------------------------------------------

export interface PipelineResult {
  /** The observation entry created (null if no actionable input) */
  readonly observation: ObservationEntry | null
  /** Number of candidates the interpreter produced */
  readonly candidateCount: number
}

// ---------------------------------------------------------------------------
// Service definition
// ---------------------------------------------------------------------------

export class TranscriptPipeline extends Context.Tag("@game/TranscriptPipeline")<
  TranscriptPipeline,
  {
    /**
     * Process transcript segments end-to-end:
     * 1. Interpret segments into candidate domain events
     * 2. If candidates exist, wrap them in an ObservationEntry
     * 3. Feed to Projector.projectLatest() for scoring + state application
     *
     * Returns a PipelineResult indicating what happened.
     */
    readonly process: (
      segments: ReadonlyArray<TranscriptSegment>,
      context: InterpretationContext
    ) => Effect.Effect<
      PipelineResult,
      TranscriptInterpretationError | ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
      GameState | AllSystemRequirements
    >
  }
>() {
  static readonly layer = Layer.effect(
    TranscriptPipeline,
    Effect.gen(function*() {
      const interpreter = yield* TranscriptInterpreter
      const projector = yield* Projector

      const process = (
        segments: ReadonlyArray<TranscriptSegment>,
        context: InterpretationContext
      ): Effect.Effect<
        PipelineResult,
        TranscriptInterpretationError | ObservationLogWriteError | EntityNotFound | Chunk.Chunk<DomainError>,
        GameState | AllSystemRequirements
      > =>
        Effect.gen(function*() {
          // 1. Interpret
          const candidates = yield* interpreter.interpret(segments, context)

          if (candidates.length === 0) {
            return { observation: null, candidateCount: 0 }
          }

          // 2. Build ObservationEntry from candidates
          const first = { event: candidates[0].event, confidence: candidates[0].confidence }
          const rest = candidates.slice(1).map((c) => ({ event: c.event, confidence: c.confidence }))
          const observation = new ObservationEntry({
            id: ObservationEntryId.make(crypto.randomUUID()),
            timestamp: new Date(),
            candidates: [first, ...rest],
            selectedIndex: null
          })

          // 3. Project through systems pipeline → score → apply best
          yield* projector.projectLatest(observation)

          return { observation, candidateCount: candidates.length }
        })

      return TranscriptPipeline.of({ process })
    })
  )
}
