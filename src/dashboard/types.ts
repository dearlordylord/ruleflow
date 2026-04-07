import type { Chunk } from "effect"

import type { EntityId } from "../domain/entities.js"
import type { Entity } from "../domain/entity.js"
import type { DomainEvent } from "../domain/events.js"
import type { Mutation } from "../domain/mutations.js"
import type { ConsistencyWarning } from "../domain/warnings.js"

export interface CandidateScore {
  readonly burden: number
  readonly confidence: number
}

export interface EvaluatedCandidate {
  readonly event: DomainEvent
  readonly confidence: number
  readonly mutations: Chunk.Chunk<Mutation>
  readonly warnings: Chunk.Chunk<ConsistencyWarning>
  readonly score: CandidateScore
}

export interface ObservationStep {
  readonly id: string
  readonly label: string
  readonly candidates: ReadonlyArray<EvaluatedCandidate>
  readonly winnerIndex: number
  /** Whether to fast-forward this step (e.g. character creation) */
  readonly fastForward: boolean
}

/** A snapshot of entity state at a given point in the scenario */
export interface Snapshot {
  readonly stepIndex: number
  readonly step: ObservationStep
  readonly entities: ReadonlyMap<EntityId, Entity>
}

export interface DashboardState {
  readonly currentSnapshotIndex: number
  readonly snapshots: ReadonlyArray<Snapshot>
  readonly autoMode: boolean
  readonly loading: boolean
}
