/**
 * Test layer compositions
 */
import { Layer } from "effect"

import { Committer } from "../src/domain/infrastructure/Committer.js"
import { EventLog } from "../src/domain/infrastructure/EventLog.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { testLayer as infraTestLayer } from "../src/domain/infrastructure/layers.js"
import { ObservationLog } from "../src/domain/infrastructure/ObservationLog.js"
import { Projector } from "../src/domain/infrastructure/Projector.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { Replayer } from "../src/domain/infrastructure/Replayer.js"
import { CombatResolver } from "../src/domain/services/CombatResolver.js"
import { DiceRoller } from "../src/domain/services/DiceRoller.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import { WeaponTemplates } from "../src/domain/services/Templates.js"

export const deterministicTestLayer = (rolls: Array<number>) =>
  Layer.mergeAll(
    infraTestLayer,
    DiceRoller.testLayer(rolls),
    CombatResolver.layer.pipe(Layer.provide(DiceRoller.testLayer(rolls))),
    WeaponTemplates.testLayer
  )

/**
 * Build a test layer with a custom IdGenerator pool.
 * Useful for replay tests where IdGenerator must cycle back to the same IDs.
 */
export const deterministicTestLayerWithIds = (rolls: Array<number>, ids: Array<string>) => {
  const baseLayer = Layer.mergeAll(
    ReadModelStore.testLayer,
    EventLog.testLayer,
    ObservationLog.testLayer,
    IdGenerator.testLayer(ids)
  )

  const gameStateLayer = GameState.layer.pipe(
    Layer.provide(baseLayer)
  )

  const committerLayer = Committer.layer.pipe(
    Layer.provide(Layer.merge(baseLayer, gameStateLayer))
  )

  const replayerLayer = Replayer.layer.pipe(
    Layer.provide(gameStateLayer)
  )

  const projectorLayer = Projector.layer.pipe(
    Layer.provide(Layer.mergeAll(baseLayer, gameStateLayer))
  )

  const customInfraTestLayer = Layer.mergeAll(
    baseLayer,
    gameStateLayer,
    committerLayer,
    replayerLayer,
    projectorLayer
  )

  return Layer.mergeAll(
    customInfraTestLayer,
    DiceRoller.testLayer(rolls),
    CombatResolver.layer.pipe(Layer.provide(DiceRoller.testLayer(rolls))),
    WeaponTemplates.testLayer
  )
}

export const maxRollTestLayer = Layer.mergeAll(
  infraTestLayer,
  DiceRoller.testMaxLayer,
  CombatResolver.layer.pipe(Layer.provide(DiceRoller.testMaxLayer)),
  WeaponTemplates.testLayer
)

export const minRollTestLayer = Layer.mergeAll(
  infraTestLayer,
  DiceRoller.testMinLayer,
  CombatResolver.layer.pipe(Layer.provide(DiceRoller.testMinLayer)),
  WeaponTemplates.testLayer
)
