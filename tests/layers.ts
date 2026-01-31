/**
 * Test layer compositions
 */
import { Layer } from "effect"
import { EventLog } from "../src/domain/infrastructure/EventLog.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { Committer } from "../src/domain/infrastructure/Committer.js"
import { DiceRoller } from "../src/domain/services/DiceRoller.js"
import { CombatResolver } from "../src/domain/services/CombatResolver.js"
import { WeaponTemplates } from "../src/domain/services/Templates.js"

const baseTestLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  EventLog.testLayer
)

const gameStateTestLayer = GameState.layer.pipe(
  Layer.provide(baseTestLayer)
)

const committerTestLayer = Committer.layer.pipe(
  Layer.provide(Layer.merge(baseTestLayer, gameStateTestLayer))
)

export const deterministicTestLayer = (rolls: number[]) =>
  Layer.mergeAll(
    baseTestLayer,
    gameStateTestLayer,
    committerTestLayer,
    DiceRoller.testLayer(rolls),
    CombatResolver.layer.pipe(Layer.provide(DiceRoller.testLayer(rolls))),
    WeaponTemplates.testLayer
  )

export const maxRollTestLayer = Layer.mergeAll(
  baseTestLayer,
  gameStateTestLayer,
  committerTestLayer,
  DiceRoller.testMaxLayer,
  CombatResolver.layer.pipe(Layer.provide(DiceRoller.testMaxLayer)),
  WeaponTemplates.testLayer
)

export const minRollTestLayer = Layer.mergeAll(
  baseTestLayer,
  gameStateTestLayer,
  committerTestLayer,
  DiceRoller.testMinLayer,
  CombatResolver.layer.pipe(Layer.provide(DiceRoller.testMinLayer)),
  WeaponTemplates.testLayer
)
