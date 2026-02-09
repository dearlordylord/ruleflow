/**
 * Test layer compositions and helpers
 */
import { Layer } from "effect"

import { ObservationEntryId } from "../src/domain/entities.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { testLayer as infraTestLayer } from "../src/domain/infrastructure/layers.js"
import { ObservationEntry, ObservationLog } from "../src/domain/infrastructure/ObservationLog.js"
import { Projector } from "../src/domain/infrastructure/Projector.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { CombatResolver } from "../src/domain/services/CombatResolver.js"
import { DiceRoller } from "../src/domain/services/DiceRoller.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import { WeaponTemplates } from "../src/domain/services/Templates.js"

/** Wrap a domain event as a single-candidate ObservationEntry with a random ID */
export const makeObservation = (event: Parameters<typeof ObservationEntry.make>[0]["candidates"][0]["event"]) =>
  new ObservationEntry({
    id: ObservationEntryId.make(crypto.randomUUID()),
    timestamp: new Date(),
    candidates: [{ event, confidence: 1.0 }],
    selectedIndex: null
  })

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
    ObservationLog.testLayer,
    IdGenerator.testLayer(ids)
  )

  const gameStateLayer = GameState.layer.pipe(
    Layer.provide(baseLayer)
  )

  const projectorLayer = Projector.layer.pipe(
    Layer.provide(Layer.mergeAll(baseLayer, gameStateLayer))
  )

  const customInfraTestLayer = Layer.mergeAll(
    baseLayer,
    gameStateLayer,
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
