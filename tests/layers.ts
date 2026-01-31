/**
 * Test layer compositions
 */
import { Layer } from "effect"
import { testLayer as infraTestLayer } from "../src/domain/infrastructure/layers.js"
import { DiceRoller } from "../src/domain/services/DiceRoller.js"
import { CombatResolver } from "../src/domain/services/CombatResolver.js"
import { WeaponTemplates } from "../src/domain/services/Templates.js"

export const deterministicTestLayer = (rolls: number[]) =>
  Layer.mergeAll(
    infraTestLayer,
    DiceRoller.testLayer(rolls),
    CombatResolver.layer.pipe(Layer.provide(DiceRoller.testLayer(rolls))),
    WeaponTemplates.testLayer
  )

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
