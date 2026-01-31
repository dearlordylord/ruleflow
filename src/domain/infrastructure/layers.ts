/**
 * Layer composition for infrastructure
 */
import { Layer } from "effect"

import { IdGenerator } from "../services/IdGenerator.js"
import { Committer } from "./Committer.js"
import { EventLog } from "./EventLog.js"
import { GameState } from "./GameState.js"
import { ReadModelStore } from "./ReadModelStore.js"

export const baseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  EventLog.testLayer,
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

export const committerLayer = Committer.layer.pipe(
  Layer.provide(Layer.merge(baseLayer, gameStateLayer))
)

export const testLayer = Layer.mergeAll(
  baseLayer,
  gameStateLayer,
  committerLayer
)
