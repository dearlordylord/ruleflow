/**
 * Combat system tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Schema } from "effect"

import { AttributesComponent, HealthComponent } from "../src/domain/character/index.js"
import { CombatStatsComponent, DiceNotation, WeaponComponent } from "../src/domain/combat/index.js"
import { EntityId } from "../src/domain/entities.js"
import { Entity } from "../src/domain/entity.js"
import { AttackPerformed } from "../src/domain/events.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import type { SetHealthMutation } from "../src/domain/mutations.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import { combatToHitSystem, traumaSystem } from "../src/domain/systems/index.js"
import { deterministicTestLayer, maxRollTestLayer } from "./layers.js"

describe("Combat To-Hit System", () => {
  it.effect("successful attack generates damage mutation", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const idGen = yield* IdGenerator

      // Setup: Create attacker with STR 16 (+3), melee bonus +2
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
              armorClass: 15,
              initiativeModifier: 0
            })
          ]
        })
      )

      // Setup: Create target with AC 15
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
              armorClass: 15,
              initiativeModifier: 0
            })
          ]
        })
      )

      // Setup: Create weapon
      const weaponId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: weaponId,
          components: [
            WeaponComponent.make({
              name: "Longsword",
              damageDice: Schema.decodeSync(DiceNotation)("1d8"),
              damageType: ["Slashing"],
              weaponGroup: "Blades",
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
        })
      )

      // Attack roll: 10 (roll) + 2 (bonus) + 3 (STR) = 15 (hit vs AC 15)
      const attackMutation = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 10,
        isCritical: false
      })

      const mutations = yield* combatToHitSystem(state, Chunk.of(attackMutation), Chunk.empty())

      expect(Chunk.size(mutations)).toBe(1)
      const damage = Chunk.unsafeHead(mutations)
      expect(damage._tag).toBe("DealDamage")
      if (damage._tag === "DealDamage") {
        expect(damage.entityId).toBe(targetId)
        expect(damage.amount).toBeGreaterThan(0)
      }
    }).pipe(Effect.provide(deterministicTestLayer([10, 5]))) // 10 for attack, 5 for damage
  )

  it.effect("miss does not generate damage", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const idGen = yield* IdGenerator

      const attackerId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: attackerId,
          components: [
            AttributesComponent.make({
              strength: 10,
              dexterity: 10,
              intelligence: 10,
              will: 10,
              constitution: 10,
              charisma: 10
            }),
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15,
              initiativeModifier: 0
            })
          ]
        })
      )

      const targetId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 20,
              initiativeModifier: 0
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
              damageType: ["Slashing"],
              weaponGroup: "Blades",
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
        })
      )

      // Attack: 10 + 0 + 0 = 10 (miss vs AC 20)
      const attackMutation = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 10,
        isCritical: false
      })

      const mutations = yield* combatToHitSystem(state, Chunk.of(attackMutation), Chunk.empty())

      expect(Chunk.isEmpty(mutations)).toBe(true)
    }).pipe(Effect.provide(deterministicTestLayer([10]))))

  it.effect("critical hit doubles damage dice", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const idGen = yield* IdGenerator

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
              meleeAttackBonus: 5,
              rangedAttackBonus: 0,
              armorClass: 15,
              initiativeModifier: 0
            })
          ]
        })
      )

      const targetId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: targetId,
          components: [
            CombatStatsComponent.make({
              meleeAttackBonus: 0,
              rangedAttackBonus: 0,
              armorClass: 15,
              initiativeModifier: 0
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
              damageType: ["Slashing"],
              weaponGroup: "Blades",
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
        })
      )

      const attackMutation = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId,
        attackRoll: 20,
        isCritical: true
      })

      const mutations = yield* combatToHitSystem(state, Chunk.of(attackMutation), Chunk.empty())

      expect(Chunk.size(mutations)).toBe(1)
      const damage = Chunk.unsafeHead(mutations)

      // With maxRollTestLayer: 1d8 = 8, crit = 8, STR +3 = 19 total
      if (damage._tag === "DealDamage") {
        expect(damage.amount).toBe(19)
      }
    }).pipe(Effect.provide(maxRollTestLayer)))
})

describe("Trauma System", () => {
  it.effect("HP <= 0 triggers trauma", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const idGen = yield* IdGenerator

      const entityId = EntityId.make(yield* idGen.generate())
      yield* store.set(
        Entity.make({
          id: entityId,
          components: [
            HealthComponent.make({
              current: 5,
              max: 20,
              traumaActive: false,
              traumaEffect: null
            })
          ]
        })
      )

      const damageMutation = {
        _tag: "DealDamage" as const,
        entityId,
        amount: 10,
        source: EntityId.make(yield* idGen.generate())
      }

      const mutations = yield* traumaSystem(state, Chunk.empty(), Chunk.of(damageMutation))

      expect(Chunk.size(mutations)).toBe(1)
      const trauma = Chunk.unsafeHead(mutations) as typeof SetHealthMutation.Type
      expect(trauma._tag).toBe("SetHealth")
      if (trauma._tag === "SetHealth") {
        expect(trauma.data.traumaActive).toBe(true)
        expect(trauma.data.traumaEffect).toBe("Bleeding")
      }
    }).pipe(Effect.provide(deterministicTestLayer([10]))))
})
