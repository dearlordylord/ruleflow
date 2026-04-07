/**
 * Layer composition for the dashboard.
 * Bridges DashboardReadModelStore → ReadModelStore, provides all system requirements.
 */
import { Layer } from "effect"

import { GameState } from "../../domain/infrastructure/GameState.js"
import { ObservationLog } from "../../domain/infrastructure/ObservationLog.js"
import { Projector } from "../../domain/infrastructure/Projector.js"
import { CombatResolver } from "../../domain/services/CombatResolver.js"
import { DiceRoller } from "../../domain/services/DiceRoller.js"
import { IdGenerator } from "../../domain/services/IdGenerator.js"
import { WeaponTemplates } from "../../domain/services/Templates.js"

import { DashboardReadModelStore } from "./DashboardReadModelStore.js"

// Deterministic dice rolls for the dashboard (damage calculations)
const DICE_ROLLS = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]

// Only IDs consumed by systems via IdGenerator at runtime.
// Guido (0001), weapon (0003), player (0099) are created manually in setup actions.
// creatureDiscoverySystem calls idGen.generate() once per CreatureDiscovered event.
const ID_POOL = [
  "00000000-0000-0000-0000-000000000002", // goblin 1
  "00000000-0000-0000-0000-000000000004", // goblin 2
  "00000000-0000-0000-0000-000000000005",
  "00000000-0000-0000-0000-000000000006",
  "00000000-0000-0000-0000-000000000007",
  "00000000-0000-0000-0000-000000000008"
]

// Base: DashboardReadModelStore + ObservationLog + IdGenerator
const storageLayer = Layer.mergeAll(
  DashboardReadModelStore.layer,
  ObservationLog.testLayer,
  IdGenerator.testLayer(ID_POOL)
)

// Bridge DashboardReadModelStore → ReadModelStore
const readModelBridge = DashboardReadModelStore.toReadModelStore.pipe(
  Layer.provide(storageLayer)
)

// GameState needs ReadModelStore
const gameStateLayer = GameState.layer.pipe(
  Layer.provide(readModelBridge)
)

// Projector needs ReadModelStore + ObservationLog + GameState
const projectorLayer = Projector.layer.pipe(
  Layer.provide(Layer.mergeAll(readModelBridge, storageLayer, gameStateLayer))
)

// DiceRoller + CombatResolver
const diceLayer = DiceRoller.testLayer(DICE_ROLLS)
const combatLayer = CombatResolver.layer.pipe(Layer.provide(diceLayer))

/**
 * Full dashboard layer providing all services.
 * DashboardReadModelStore is accessible for getAll().
 */
export const dashboardLayer = Layer.mergeAll(
  storageLayer,
  readModelBridge,
  gameStateLayer,
  projectorLayer,
  diceLayer,
  combatLayer,
  WeaponTemplates.testLayer
)
