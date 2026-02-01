/**
 * Event Replay tests - verifying event sourcing architecture
 */
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Schema } from "effect"

import {
  AttributesComponent,
  CombatStatsComponent,
  CurrencyComponent,
  DiceNotation,
  Entity,
  getComponent,
  HealthComponent,
  WeaponComponent
} from "../src/domain/components.js"
import { EntityId } from "../src/domain/entities.js"
import { AttackPerformed, CurrencyTransferred } from "../src/domain/combat/events.js"
import { Committer } from "../src/domain/infrastructure/Committer.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { Replayer } from "../src/domain/infrastructure/Replayer.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import { combatToHitSystem, currencyTransferSystem, runSystemsPipeline } from "../src/domain/systems/index.js"
import { deterministicTestLayer } from "./layers.js"

describe("Event Replay", () => {
  it.effect("replays combat event to identical state", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const committer = yield* Committer
      const replayer = yield* Replayer
      const idGen = yield* IdGenerator

      // Setup entities
      const attackerId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: attackerId,
          components: [
            AttributesComponent.make({
              strength: 16,
              dexterity: 10,
              intelligence: 10,
              will: 10,
              constitution: 10,
              charisma: 10
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 2,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )

      const targetId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            HealthComponent.make({
              current: 20,
              max: 20,
              traumaActive: false,
              traumaEffect: null
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )

      const weaponId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: weaponId,
          components: [
            WeaponComponent.make({
              name: "Longsword",
              damageDice: Schema.decodeSync(DiceNotation)("1d8"),
              weaponGroup: "Blades",
              traits: []
            })
          ]
        })
      )

      // Create and commit event
      const attackEvent = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 15
      })

      const mutations = yield* runSystemsPipeline([combatToHitSystem], Chunk.of(attackEvent))
      const entry = yield* committer.commit(attackEvent, mutations)

      // Get state after commit
      const targetAfterCommit = yield* state.getEntity(targetId)
      const healthAfterCommit = getComponent(targetAfterCommit, "Health")
      expect(healthAfterCommit).toBeTruthy()

      // Clear state and replay
      yield* store.clear()
      // Restore initial entity state
      yield* store.set(
        Entity.make({
          id: attackerId,
          components: [
            AttributesComponent.make({
              strength: 16,
              dexterity: 10,
              intelligence: 10,
              will: 10,
              constitution: 10,
              charisma: 10
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 2,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            HealthComponent.make({
              current: 20,
              max: 20,
              traumaActive: false,
              traumaEffect: null
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )
      yield* store.set(
        Entity.make({
          id: weaponId,
          components: [
            WeaponComponent.make({
              name: "Longsword",
              damageDice: Schema.decodeSync(DiceNotation)("1d8"),
              weaponGroup: "Blades",
              traits: []
            })
          ]
        })
      )
      yield* replayer.replay([combatToHitSystem], [entry])

      // Verify replayed state matches original
      const targetAfterReplay = yield* state.getEntity(targetId)
      const healthAfterReplay = getComponent(targetAfterReplay, "Health")

      expect(healthAfterReplay?.current).toBe(healthAfterCommit?.current)
    }).pipe(Effect.provide(deterministicTestLayer([5, 5])))  // Damage rolls for commit + replay
  )

  it.effect("replays currency transfer event atomically", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const committer = yield* Committer
      const replayer = yield* Replayer
      const idGen = yield* IdGenerator

      // Setup entities with currency
      const fromId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: fromId,
          components: [
            CurrencyComponent.make({
              copper: 100,
              silver: 50,
              gold: 10
            })
          ]
        })
      )

      const toId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: toId,
          components: [
            CurrencyComponent.make({
              copper: 0,
              silver: 0,
              gold: 0
            })
          ]
        })
      )

      // Create and commit transfer event
      const transferEvent = CurrencyTransferred.make({
        fromEntityId: fromId,
        toEntityId: toId,
        copper: 50,
        silver: 25,
        gold: 5
      })

      const mutations = yield* runSystemsPipeline([currencyTransferSystem], Chunk.of(transferEvent))
      const entry = yield* committer.commit(transferEvent, mutations)

      // Get state after commit
      const fromAfterCommit = yield* state.getEntity(fromId)
      const toAfterCommit = yield* state.getEntity(toId)
      const fromCurrencyAfterCommit = getComponent(fromAfterCommit, "Currency")
      const toCurrencyAfterCommit = getComponent(toAfterCommit, "Currency")

      expect(fromCurrencyAfterCommit?.copper).toBe(50)
      expect(fromCurrencyAfterCommit?.silver).toBe(25)
      expect(fromCurrencyAfterCommit?.gold).toBe(5)
      expect(toCurrencyAfterCommit?.copper).toBe(50)
      expect(toCurrencyAfterCommit?.silver).toBe(25)
      expect(toCurrencyAfterCommit?.gold).toBe(5)

      // Clear state and replay
      yield* store.clear()
      // Need to restore initial state before replay
      yield* store.set(
        Entity.make({
          id: fromId,
          components: [
            CurrencyComponent.make({
              copper: 100,
              silver: 50,
              gold: 10
            })
          ]
        })
      )
      yield* store.set(
        Entity.make({
          id: toId,
          components: [
            CurrencyComponent.make({
              copper: 0,
              silver: 0,
              gold: 0
            })
          ]
        })
      )

      yield* replayer.replay([currencyTransferSystem], [entry])

      // Verify replayed state matches original
      const fromAfterReplay = yield* state.getEntity(fromId)
      const toAfterReplay = yield* state.getEntity(toId)
      const fromCurrencyAfterReplay = getComponent(fromAfterReplay, "Currency")
      const toCurrencyAfterReplay = getComponent(toAfterReplay, "Currency")

      expect(fromCurrencyAfterReplay?.copper).toBe(fromCurrencyAfterCommit?.copper)
      expect(fromCurrencyAfterReplay?.silver).toBe(fromCurrencyAfterCommit?.silver)
      expect(fromCurrencyAfterReplay?.gold).toBe(fromCurrencyAfterCommit?.gold)
      expect(toCurrencyAfterReplay?.copper).toBe(toCurrencyAfterCommit?.copper)
      expect(toCurrencyAfterReplay?.silver).toBe(toCurrencyAfterCommit?.silver)
      expect(toCurrencyAfterReplay?.gold).toBe(toCurrencyAfterCommit?.gold)
    }).pipe(Effect.provide(deterministicTestLayer([])))
  )

  it.effect("replays multiple events in sequence", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const committer = yield* Committer
      const replayer = yield* Replayer
      const idGen = yield* IdGenerator

      // Setup attacker
      const attackerId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: attackerId,
          components: [
            AttributesComponent.make({
              strength: 16,
              dexterity: 10,
              intelligence: 10,
              will: 10,
              constitution: 10,
              charisma: 10
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 2,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )

      const targetId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            HealthComponent.make({
              current: 20,
              max: 20,
              traumaActive: false,
              traumaEffect: null
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )

      const weaponId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: weaponId,
          components: [
            WeaponComponent.make({
              name: "Longsword",
              damageDice: Schema.decodeSync(DiceNotation)("1d8"),
              weaponGroup: "Blades",
              traits: []
            })
          ]
        })
      )

      // Commit two attacks
      const attack1 = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 15
      })
      const mutations1 = yield* runSystemsPipeline([combatToHitSystem], Chunk.of(attack1))
      const entry1 = yield* committer.commit(attack1, mutations1)

      const attack2 = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 18,
        isCritical: false
      })
      const mutations2 = yield* runSystemsPipeline([combatToHitSystem], Chunk.of(attack2))
      const entry2 = yield* committer.commit(attack2, mutations2)

      // Get final state
      const targetFinal = yield* state.getEntity(targetId)
      const healthFinal = getComponent(targetFinal, "Health")

      // Clear and replay
      yield* store.clear()
      yield* store.set(
        Entity.make({
          id: attackerId,
          components: [
            AttributesComponent.make({
              strength: 16,
              dexterity: 10,
              intelligence: 10,
              will: 10,
              constitution: 10,
              charisma: 10
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 2,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            HealthComponent.make({
              current: 20,
              max: 20,
              traumaActive: false,
              traumaEffect: null
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15
            })
          ]
        })
      )
      yield* store.set(
        Entity.make({
          id: weaponId,
          components: [
            WeaponComponent.make({
              name: "Longsword",
              damageDice: Schema.decodeSync(DiceNotation)("1d8"),
              weaponGroup: "Blades",
              traits: []
            })
          ]
        })
      )

      yield* replayer.replay([combatToHitSystem], [entry1, entry2])

      // Verify replay produces identical state
      const targetReplayed = yield* state.getEntity(targetId)
      const healthReplayed = getComponent(targetReplayed, "Health")

      expect(healthReplayed?.current).toBe(healthFinal?.current)
    }).pipe(Effect.provide(deterministicTestLayer([5, 6, 5, 6])))  // Damage rolls for 2 attacks * 2 (commit + replay)
  )
})
