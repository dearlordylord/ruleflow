/**
 * Layer composition for infrastructure
 */
import { Layer } from "effect"

import { IdGenerator } from "../services/IdGenerator.js"
import { GameState } from "./GameState.js"
import { ObservationLog } from "./ObservationLog.js"
import { Projector } from "./Projector.js"
import { ReadModelStore } from "./ReadModelStore.js"

export const baseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  ObservationLog.testLayer,
  IdGenerator.testLayer([
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005"
  ])
)

export const gameStateLayer = GameState.layer.pipe(
  Layer.provide(baseLayer)
)

export const projectorLayer = Projector.layer.pipe(
  Layer.provide(Layer.mergeAll(baseLayer, gameStateLayer))
)

export const testLayer = Layer.mergeAll(
  baseLayer,
  gameStateLayer,
  projectorLayer
)
