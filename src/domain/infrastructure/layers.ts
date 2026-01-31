/**
 * Layer composition for infrastructure
 */
import { Layer } from "effect"
import { EventLog } from "./EventLog.js"
import { ReadModelStore } from "./ReadModelStore.js"
import { GameState } from "./GameState.js"
import { Committer } from "./Committer.js"

export const baseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  EventLog.testLayer
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
