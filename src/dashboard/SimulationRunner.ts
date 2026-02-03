/**
 * Simulation Runner - runs the simulation step by step
 */
/* eslint-disable functional/immutable-data -- local map mutations for in-memory store implementation */
/* eslint-disable @typescript-eslint/consistent-type-imports -- dynamic import() for error types */
import { Chunk, Context, Effect, Layer, Option, Ref, Schema, SynchronizedRef } from "effect"

import {
  AlignmentChosen,
  AttributesRolled,
  CharacterCreationCompleted,
  CharacterCreationStarted,
  ClassChosen,
  HitPointsRolled,
  NameChosen,
  SkillsChosen,
  StartingMoneyRolled,
  TraitChosen,
  WeaponGroupSpecializationChosen
} from "../domain/character/creationEvents.js"
import { CharacterDied } from "../domain/character/events.js"
import { CombatStatsComponent } from "../domain/combat/stats.js"
import { DiceNotation, WeaponComponent } from "../domain/combat/weapons.js"
import type { EventLogEntryId } from "../domain/entities.js"
import { EntityId } from "../domain/entities.js"
import type { Entity } from "../domain/entity.js"
import { Entity as EntityClass, getComponent, setComponent } from "../domain/entity.js"
import type { DomainEvent } from "../domain/events.js"
import {
  AttackPerformed,
  CombatEnded,
  CombatRoundEnded,
  CombatRoundStarted,
  CombatStarted,
  CreatureDiscovered,
  CurrencyTransferred,
  InitiativeRolled,
  MonsterDamageInflicted,
  TurnEnded,
  TurnStarted
} from "../domain/events.js"
import { Committer } from "../domain/infrastructure/Committer.js"
import type { EventLogEntry } from "../domain/infrastructure/EventLog.js"
import { EventLog } from "../domain/infrastructure/EventLog.js"
import { GameState } from "../domain/infrastructure/GameState.js"
import { ReadModelStore } from "../domain/infrastructure/ReadModelStore.js"
import { CurrencyComponent } from "../domain/inventory/currency.js"
import { CorpseComponent } from "../domain/inventory/looting.js"
import type { Mutation } from "../domain/mutations.js"
import { CombatResolver } from "../domain/services/CombatResolver.js"
import { DiceRoller } from "../domain/services/DiceRoller.js"
import { IdGenerator } from "../domain/services/IdGenerator.js"
import { WeaponTemplates } from "../domain/services/Templates.js"
import {
  characterCreationSystem,
  combatToHitSystem,
  creatureDiscoverySystem,
  currencyTransferSystem,
  monsterDamageSystem,
  runSystemsPipeline,
  traumaSystem
} from "../domain/systems/index.js"

// Extended ReadModelStore that tracks all entities
class DashboardReadModelStore extends Context.Tag("@dashboard/ReadModelStore")<
  DashboardReadModelStore,
  {
    readonly get: (id: EntityId) => Effect.Effect<Entity, import("../domain/errors.js").EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, import("../domain/errors.js").EntityNotFound>
    readonly clear: () => Effect.Effect<void>
    readonly getAll: () => Effect.Effect<ReadonlyArray<Entity>>
  }
>() {
  static readonly layer = Layer.effect(
    DashboardReadModelStore,
    Effect.gen(function*() {
      const store = yield* SynchronizedRef.make(new Map<EntityId, Entity>())

      const get = (id: EntityId) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((map) =>
            Option.match(Option.fromNullable(map.get(id)), {
              onNone: () => Effect.fail({ _tag: "EntityNotFound" as const, id }),
              onSome: Effect.succeed
            })
          )
        ) as Effect.Effect<Entity, import("../domain/errors.js").EntityNotFound>

      const set = (entity: Entity) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(entity.id, entity)
          return newMap
        })

      const update = (
        id: EntityId,
        f: (entity: Entity) => Effect.Effect<Entity>
      ) =>
        SynchronizedRef.updateEffect(store, (map) =>
          Effect.gen(function*() {
            const entity = Option.fromNullable(map.get(id))
            if (Option.isNone(entity)) {
              return yield* Effect.fail({ _tag: "EntityNotFound" as const, id })
            }
            const updated = yield* f(entity.value)
            const newMap = new Map(map)
            newMap.set(id, updated)
            return newMap
          })) as Effect.Effect<void, import("../domain/errors.js").EntityNotFound>

      const clear = () => SynchronizedRef.update(store, () => new Map<EntityId, Entity>())

      const getAll = () =>
        SynchronizedRef.get(store).pipe(
          Effect.map((map) => Array.from(map.values()))
        )

      return DashboardReadModelStore.of({ get, set, update, clear, getAll })
    })
  )
}

/**
 * Mutable state refs for tracking IDs during simulation
 */
class SimulationRefs extends Context.Tag("@dashboard/SimulationRefs")<
  SimulationRefs,
  {
    readonly visibleCreatures: Ref.Ref<Map<string, EntityId>> // name -> id mapping
    readonly weaponId: Ref.Ref<EntityId | null>
  }
>() {
  static readonly layer = Layer.effect(
    SimulationRefs,
    Effect.gen(function*() {
      const visibleCreatures = yield* Ref.make(new Map<string, EntityId>())
      const weaponId = yield* Ref.make<EntityId | null>(null)
      return SimulationRefs.of({ visibleCreatures, weaponId })
    })
  )
}

type RenderFn = (
  processedEvents: ReadonlyArray<DomainEvent>,
  currentEventIndex: number,
  entities: ReadonlyArray<Entity>,
  totalEvents: number
) => void

const sleep = (ms: number) => Effect.promise(() => new Promise(resolve => setTimeout(resolve, ms)))

/**
 * Run the full animated simulation
 */
export const runAnimatedSimulation = (render: RenderFn, delayMs: number) =>
  Effect.gen(function*() {
    const store = yield* DashboardReadModelStore
    const committer = yield* Committer
    const idGen = yield* IdGenerator
    const refs = yield* SimulationRefs

    // Helper to process an event
    const processEvent = (event: DomainEvent) =>
      Effect.gen(function*() {
        let mutations: Chunk.Chunk<Mutation>

        switch (event._tag) {
          case "CharacterCreationStarted":
          case "AttributesRolled":
          case "ClassChosen":
          case "WeaponGroupSpecializationChosen":
          case "SkillsChosen":
          case "TraitChosen":
          case "HitPointsRolled":
          case "StartingMoneyRolled":
          case "AlignmentChosen":
          case "NameChosen":
          case "CharacterCreationCompleted":
            mutations = yield* runSystemsPipeline([characterCreationSystem], Chunk.of(event))
            break

          case "CreatureDiscovered": {
            mutations = yield* runSystemsPipeline([creatureDiscoverySystem], Chunk.of(event))
            // Extract the creature ID from the CreateEntity mutation
            const createMutation = Chunk.toReadonlyArray(mutations).find(
              m => m._tag === "CreateEntity"
            ) as { entity: Entity } | undefined
            if (createMutation) {
              const creatures = yield* Ref.get(refs.visibleCreatures)
              creatures.set(event.name, createMutation.entity.id)
              yield* Ref.set(refs.visibleCreatures, creatures)
            }
            break
          }

          case "AttackPerformed":
            mutations = yield* runSystemsPipeline([combatToHitSystem, traumaSystem], Chunk.of(event))
            break

          case "CurrencyTransferred":
            mutations = yield* runSystemsPipeline([currencyTransferSystem], Chunk.of(event))
            break

          case "MonsterDamageInflicted":
            // DM-declared damage from monster -> DealDamageMutation -> traumaSystem
            mutations = yield* runSystemsPipeline([monsterDamageSystem, traumaSystem], Chunk.of(event))
            break

          case "CharacterDied":
            // Mark entity as corpse
            yield* store.update(event.entityId, (entity) =>
              Effect.succeed(setComponent(
                entity,
                CorpseComponent.make({
                  killedBy: event.killedBy,
                  deathTime: Date.now(),
                  decayTimer: null
                })
              )))
            mutations = Chunk.empty()
            break

          default:
            mutations = Chunk.empty()
        }

        yield* committer.commit(event, mutations)
      })

    // Generate IDs
    const guidoId = EntityId.make(yield* idGen.generate())
    const playerId = EntityId.make("00000000-0000-0000-0000-000000000099")

    // Create initial entity for Guido
    yield* store.set(EntityClass.make({ id: guidoId, components: [] }))

    // Build character creation events
    const charEvents: ReadonlyArray<DomainEvent> = [
      CharacterCreationStarted.make({ entityId: guidoId, playerId, startingLevel: 1 }),
      AttributesRolled.make({
        entityId: guidoId,
        strength: 14,
        dexterity: 12,
        constitution: 15,
        intelligence: 10,
        will: 13,
        charisma: 8
      }),
      ClassChosen.make({ entityId: guidoId, class: "Fighter" }),
      WeaponGroupSpecializationChosen.make({ entityId: guidoId, weaponGroup: "HeavyBlades" }),
      SkillsChosen.make({
        entityId: guidoId,
        primarySkills: ["MeleeCombat", "Accuracy"],
        secondarySkills: ["Awareness", "Survival", "Medicine"]
      }),
      TraitChosen.make({ entityId: guidoId, traitName: "Combat Reflexes" }),
      HitPointsRolled.make({ entityId: guidoId, rolledValue: 7, constitutionModifier: 1 }),
      StartingMoneyRolled.make({ entityId: guidoId, silverAmount: 110 }),
      AlignmentChosen.make({ entityId: guidoId, alignment: "Neutral" }),
      NameChosen.make({ entityId: guidoId, name: "Guido" }),
      CharacterCreationCompleted.make({ entityId: guidoId })
    ]

    // Goblin 1 discovery - monsters are just names, no stats
    const goblin1Discovery = CreatureDiscovered.make({
      name: "Goblin Scout",
      discoveredAt: null
    })

    // Goblin 2 discovery
    const goblin2Discovery = CreatureDiscovered.make({
      name: "Goblin Warrior",
      discoveredAt: null
    })

    // Dragon discovery - just a name, no stats
    const dragonDiscovery = CreatureDiscovered.make({
      name: "Ancient Red Dragon",
      discoveredAt: null
    })

    // Total events: 11 char creation + 3 combat encounters with full round structure
    // Combat 1: discovery + start + 2 init + roundStart + 2*(turnStart+turnEnd) + attack + death + roundEnd + combatEnd + loot = 14
    // Combat 2: Same = 14
    // Combat 3: Same but with MonsterDamageInflicted = 13
    const totalEvents = 11 + 14 + 14 + 13 // 52 total

    const processedEvents: Array<DomainEvent> = []
    let eventIdx = 0

    // Helper to process, render, and wait (with configurable delay)
    const stepWithDelay = (event: DomainEvent, delay: number) =>
      Effect.gen(function*() {
        yield* processEvent(event)
        processedEvents.push(event)
        const entities = yield* store.getAll()
        render(processedEvents, eventIdx, entities, totalEvents)
        eventIdx++
        yield* sleep(delay)
      })

    // Fast step for character creation (5x faster)
    const stepFast = (event: DomainEvent) => stepWithDelay(event, delayMs / 5)

    // Normal step for combat events
    const step = (event: DomainEvent) => stepWithDelay(event, delayMs)

    // PHASE 1: Character Creation (5x faster)
    for (const event of charEvents) {
      yield* stepFast(event)
    }

    // Create weapon for Guido (before combat)
    const weaponId = EntityId.make(yield* idGen.generate())
    yield* Ref.set(refs.weaponId, weaponId)

    yield* store.set(EntityClass.make({
      id: weaponId,
      components: [
        WeaponComponent.make({
          name: "Longsword",
          damageDice: Schema.decodeSync(DiceNotation)("1d8"),
          damageType: ["Slashing"],
          weaponGroup: "HeavyBlades",
          size: "Medium",
          traits: [],
          reach: 5,
          rangeClose: null,
          rangeMedium: null,
          rangeLong: null,
          durability: 10,
          maxDurability: 10
        })
      ]
    }))

    // Add combat stats to Guido
    yield* store.update(guidoId, (entity) =>
      Effect.succeed(setComponent(
        entity,
        CombatStatsComponent.make({
          meleeAttackBonus: 4,
          rangedAttackBonus: 2,
          armorClass: 11,
          initiativeModifier: 0
        })
      )))

    // ========================================================================
    // PHASE 2: First Goblin Encounter (with proper combat rounds)
    // ========================================================================

    yield* step(goblin1Discovery)

    const creatures = yield* Ref.get(refs.visibleCreatures)
    const goblin1Id = creatures.get("Goblin Scout")!

    // Combat starts
    yield* step(CombatStarted.make({
      participants: [guidoId, goblin1Id],
      surprisedParticipants: [],
      roundNumber: 1
    }))

    // Initiative: Guido rolls 5, Goblin rolls 3 -> Guido acts first
    yield* step(InitiativeRolled.make({ entityId: guidoId, roll: 5, total: 5 }))
    yield* step(InitiativeRolled.make({ entityId: goblin1Id, roll: 3, total: 3 }))

    // Round 1 starts - Players side acts first (won initiative)
    yield* step(CombatRoundStarted.make({ roundNumber: 1, activeSide: "Players" }))

    // Guido's turn
    yield* step(TurnStarted.make({ entityId: guidoId, roundNumber: 1 }))

    // Attack goblin 1
    yield* step(AttackPerformed.make({
      attackerId: guidoId,
      targetId: goblin1Id,
      weaponId,
      attackRoll: 15
    }))

    yield* step(TurnEnded.make({ entityId: guidoId, roundNumber: 1 }))

    // Goblin's turn (but it dies before acting)
    yield* step(TurnStarted.make({ entityId: goblin1Id, roundNumber: 1 }))

    // DM declares goblin dead
    yield* step(CharacterDied.make({
      entityId: goblin1Id,
      killedBy: guidoId,
      finalHP: 0
    }))

    yield* step(TurnEnded.make({ entityId: goblin1Id, roundNumber: 1 }))
    yield* step(CombatRoundEnded.make({ roundNumber: 1 }))

    // Combat ends - Guido wins
    yield* step(CombatEnded.make({ roundsElapsed: 1, victor: "Players" }))

    // Looting (outside combat)
    yield* store.update(goblin1Id, (entity) =>
      Effect.succeed(setComponent(
        entity,
        CurrencyComponent.make({ copper: 0, silver: 8, gold: 0, platinum: 0 })
      )))

    yield* step(CurrencyTransferred.make({
      fromEntityId: goblin1Id,
      toEntityId: guidoId,
      copper: 0,
      silver: 8,
      gold: 0,
      platinum: 0
    }))

    // ========================================================================
    // PHASE 3: Second Goblin Encounter
    // ========================================================================

    yield* step(goblin2Discovery)

    const creatures2 = yield* Ref.get(refs.visibleCreatures)
    const goblin2Id = creatures2.get("Goblin Warrior")!

    // Combat starts
    yield* step(CombatStarted.make({
      participants: [guidoId, goblin2Id],
      surprisedParticipants: [],
      roundNumber: 1
    }))

    // Initiative: Guido rolls 4, Goblin rolls 2
    yield* step(InitiativeRolled.make({ entityId: guidoId, roll: 4, total: 4 }))
    yield* step(InitiativeRolled.make({ entityId: goblin2Id, roll: 2, total: 2 }))

    yield* step(CombatRoundStarted.make({ roundNumber: 1, activeSide: "Players" }))

    // Guido's turn
    yield* step(TurnStarted.make({ entityId: guidoId, roundNumber: 1 }))

    yield* step(AttackPerformed.make({
      attackerId: guidoId,
      targetId: goblin2Id,
      weaponId,
      attackRoll: 18
    }))

    yield* step(TurnEnded.make({ entityId: guidoId, roundNumber: 1 }))

    // Goblin dies
    yield* step(TurnStarted.make({ entityId: goblin2Id, roundNumber: 1 }))
    yield* step(CharacterDied.make({
      entityId: goblin2Id,
      killedBy: guidoId,
      finalHP: 0
    }))
    yield* step(TurnEnded.make({ entityId: goblin2Id, roundNumber: 1 }))

    yield* step(CombatRoundEnded.make({ roundNumber: 1 }))
    yield* step(CombatEnded.make({ roundsElapsed: 1, victor: "Players" }))

    // Loot goblin 2
    yield* store.update(goblin2Id, (entity) =>
      Effect.succeed(setComponent(
        entity,
        CurrencyComponent.make({ copper: 5, silver: 15, gold: 1, platinum: 0 })
      )))

    yield* step(CurrencyTransferred.make({
      fromEntityId: goblin2Id,
      toEntityId: guidoId,
      copper: 5,
      silver: 15,
      gold: 1,
      platinum: 0
    }))

    // ========================================================================
    // PHASE 4: Dragon Encounter (doom!)
    // ========================================================================

    yield* step(dragonDiscovery)

    const creatures3 = yield* Ref.get(refs.visibleCreatures)
    const dragonId = creatures3.get("Ancient Red Dragon")!

    // Combat starts
    yield* step(CombatStarted.make({
      participants: [guidoId, dragonId],
      surprisedParticipants: [guidoId], // Guido is surprised!
      roundNumber: 1
    }))

    // Initiative: Dragon wins (6 vs 2)
    yield* step(InitiativeRolled.make({ entityId: dragonId, roll: 6, total: 6 }))
    yield* step(InitiativeRolled.make({ entityId: guidoId, roll: 2, total: 2 }))

    yield* step(CombatRoundStarted.make({ roundNumber: 1, activeSide: "Enemies" }))

    // Dragon's turn - DM declares damage
    yield* step(TurnStarted.make({ entityId: dragonId, roundNumber: 1 }))

    yield* step(MonsterDamageInflicted.make({
      targetId: guidoId,
      damageAmount: 30,
      source: "Ancient Red Dragon"
    }))

    yield* step(TurnEnded.make({ entityId: dragonId, roundNumber: 1 }))

    // Guido's turn (but he's dead)
    yield* step(TurnStarted.make({ entityId: guidoId, roundNumber: 1 }))

    const guidoEntity = yield* store.get(guidoId)
    const guidoHealth = getComponent(guidoEntity, "Health")

    yield* step(CharacterDied.make({
      entityId: guidoId,
      killedBy: null,
      finalHP: guidoHealth?.current ?? -22
    }))

    yield* step(TurnEnded.make({ entityId: guidoId, roundNumber: 1 }))
    yield* step(CombatRoundEnded.make({ roundNumber: 1 }))
    yield* step(CombatEnded.make({ roundsElapsed: 1, victor: "Enemies" }))
  })

// Bridge DashboardReadModelStore to ReadModelStore for GameState
const readModelBridgeLayer = Layer.effect(
  ReadModelStore,
  Effect.gen(function*() {
    const dashboard = yield* DashboardReadModelStore
    return ReadModelStore.of({
      get: dashboard.get,
      set: dashboard.set,
      update: dashboard.update,
      clear: dashboard.clear
    })
  })
).pipe(Layer.provide(DashboardReadModelStore.layer))

// EventLog bridge for committer
const eventLogBridgeLayer = Layer.effect(
  EventLog,
  Effect.gen(function*() {
    const store = yield* SynchronizedRef.make(new Map<EventLogEntryId, EventLogEntry>())

    return EventLog.of({
      append: (entry) =>
        SynchronizedRef.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(entry.id, entry)
          return newMap
        }),
      read: (id) =>
        SynchronizedRef.get(store).pipe(
          Effect.flatMap((map) =>
            Option.match(Option.fromNullable(map.get(id)), {
              onNone: () => Effect.fail({ _tag: "EventLogEntryNotFound" as const, id }),
              onSome: Effect.succeed
            })
          )
        ) as Effect.Effect<EventLogEntry, import("../domain/errors.js").EventLogEntryNotFound>
    })
  })
)

// Generate 100 sequential UUIDs for entities and event log entries
const generateIds = (count: number) =>
  Array.from({ length: count }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`)

const idGenLayer = IdGenerator.testLayer(generateIds(100))

const gameStateLayer = GameState.layer.pipe(
  Layer.provide(readModelBridgeLayer)
)

const committerLayer = Committer.layer.pipe(
  Layer.provide(Layer.mergeAll(
    readModelBridgeLayer,
    eventLogBridgeLayer,
    gameStateLayer,
    idGenLayer
  ))
)

const diceLayer = DiceRoller.testLayer([5, 5, 5, 5, 5, 5, 5, 5, 30]) // Last roll is dragon damage

export const simulationLayer = Layer.mergeAll(
  DashboardReadModelStore.layer,
  SimulationRefs.layer,
  idGenLayer,
  readModelBridgeLayer,
  eventLogBridgeLayer,
  gameStateLayer,
  committerLayer,
  diceLayer,
  CombatResolver.layer.pipe(Layer.provide(diceLayer)),
  WeaponTemplates.testLayer
)
