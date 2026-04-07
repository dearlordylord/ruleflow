/**
 * Runner - eagerly evaluates all observations through the systems pipeline,
 * producing an array of Snapshots. The UI navigates between snapshots
 * with left/right arrows — no async coordination needed.
 */
import { Chunk, Effect } from "effect"

import { ObservationEntry } from "../../domain/infrastructure/ObservationLog.js"
import type { Mutation } from "../../domain/mutations.js"
import { type AllSystemRequirements, getAllSystems, runSystemsPipeline } from "../../domain/systems/index.js"
import type { System } from "../../domain/systems/types.js"
import type { ConsistencyWarning } from "../../domain/warnings.js"
import { GameState } from "../../domain/infrastructure/GameState.js"
import { ObservationLog } from "../../domain/infrastructure/ObservationLog.js"

import type { EvaluatedCandidate, ObservationStep, Snapshot } from "../types.js"
import { DashboardReadModelStore } from "./DashboardReadModelStore.js"
import { allObservations, setupActions } from "./scenario.js"
import { validationSystem } from "./validationSystem.js"

const scoreCandidate = (
  warnings: Chunk.Chunk<ConsistencyWarning>,
  confidence: number
) => ({
  burden: Chunk.reduce(warnings, 0, (acc, w) => acc + w.severity),
  confidence
})

const buildPipeline = (): Array<System<AllSystemRequirements>> => [
  ...(getAllSystems() as Array<System<AllSystemRequirements>>),
  validationSystem as System<AllSystemRequirements>
]

/**
 * Pre-compute all snapshots by running through every observation.
 * Returns an array of Snapshots the UI can freely navigate.
 */
export const computeAllSnapshots: Effect.Effect<
  ReadonlyArray<Snapshot>,
  unknown,
  DashboardReadModelStore | GameState | ObservationLog | AllSystemRequirements
> = Effect.gen(function*() {
  const store = yield* DashboardReadModelStore
  const gameState = yield* GameState
  const observationLog = yield* ObservationLog
  const systems = buildPipeline()
  const snapshots: Array<Snapshot> = []

  for (let i = 0; i < allObservations.length; i++) {
    const obs = allObservations[i]

    // Execute setup actions before this step
    for (const action of setupActions) {
      if (action.beforeStepIndex === i) {
        yield* action.effect
      }
    }

    const entry = obs.observation

    // Evaluate all candidates
    const evaluated: Array<EvaluatedCandidate> = []
    for (const candidate of entry.candidates) {
      const result = yield* runSystemsPipeline(
        systems,
        Chunk.of(candidate.event)
      )
      evaluated.push({
        event: candidate.event,
        confidence: candidate.confidence,
        mutations: result.mutations,
        warnings: result.warnings,
        score: scoreCandidate(result.warnings, candidate.confidence)
      })
    }

    // Select best candidate
    let bestIndex = 0
    let bestScore = evaluated[0].score
    let bestMutations: Chunk.Chunk<Mutation> = evaluated[0].mutations
    for (let j = 1; j < evaluated.length; j++) {
      const current = evaluated[j]
      if (
        current.score.burden < bestScore.burden
        || (current.score.burden === bestScore.burden
          && current.score.confidence > bestScore.confidence)
      ) {
        bestIndex = j
        bestScore = current.score
        bestMutations = current.mutations
      }
    }

    // Apply winning mutations
    const withSelection = new ObservationEntry({
      ...entry,
      selectedIndex: bestIndex
    })
    yield* observationLog.append(withSelection)
    yield* Effect.forEach(bestMutations, (m) => gameState.applyMutation(m))

    const step: ObservationStep = {
      id: entry.id,
      label: obs.label,
      candidates: evaluated,
      winnerIndex: bestIndex,
      fastForward: obs.fastForward
    }

    // Snapshot entity state after applying
    const entities = yield* store.getAll()

    snapshots.push({
      stepIndex: i,
      step,
      entities: new Map(entities)
    })
  }

  return snapshots
})
