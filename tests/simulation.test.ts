/**
 * Full Game Simulation Test
 *
 * Demonstrates event sourcing flow:
 * 1. Character creation (Guido the Fighter)
 * 2. Enemy encounter (goblin appears via CreatureDiscovered)
 * 3. Combat (Guido attacks goblin with longsword)
 * 4. Looting (currency from goblin)
 */
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Schema } from "effect"

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
  TraitChosen
} from "../src/domain/character/creationEvents.js"
import { CombatStatsComponent } from "../src/domain/combat/stats.js"
import { DiceNotation, WeaponComponent } from "../src/domain/combat/weapons.js"
import { EntityId } from "../src/domain/entities.js"
import { Entity, getComponent, setComponent } from "../src/domain/entity.js"
import { AttackPerformed, CreatureDiscovered, CurrencyTransferred } from "../src/domain/events.js"
import { Committer } from "../src/domain/infrastructure/Committer.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { CurrencyComponent } from "../src/domain/inventory/currency.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import {
  characterCreationSystem,
  combatToHitSystem,
  creatureDiscoverySystem,
  currencyTransferSystem,
  runSystemsPipeline,
  traumaSystem
} from "../src/domain/systems/index.js"
import { deterministicTestLayer } from "./layers.js"

describe("Full Game Simulation", () => {
  it.effect("simulates character creation -> combat -> looting flow", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const store = yield* ReadModelStore
      const committer = yield* Committer
      const idGen = yield* IdGenerator

      // ========================================================================
      // PHASE 1: Character Creation - "Guido the Fighter"
      // ========================================================================

      const guidoId = EntityId.make(yield* idGen.generate())
      const playerId = EntityId.make("00000000-0000-0000-0000-000000000099")

      // Create empty entity first (entity must exist before mutations)
      yield* store.set(Entity.make({ id: guidoId, components: [] }))

      // Process character creation events one by one (each needs state from previous)
      const charEvents = [
        CharacterCreationStarted.make({
          entityId: guidoId,
          playerId,
          startingLevel: 1
        }),
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
        SkillsChosen.make({
          entityId: guidoId,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        TraitChosen.make({ entityId: guidoId, traitName: "WeaponSpecialization" }),
        HitPointsRolled.make({ entityId: guidoId, rolledValue: 7, constitutionModifier: 1 }),
        StartingMoneyRolled.make({ entityId: guidoId, silverAmount: 110 }),
        AlignmentChosen.make({ entityId: guidoId, alignment: "Neutral" }),
        NameChosen.make({ entityId: guidoId, name: "Guido" }),
        CharacterCreationCompleted.make({ entityId: guidoId })
      ]

      // Process each event and commit (state must update between events)
      for (const event of charEvents) {
        const mutations = yield* runSystemsPipeline(
          [characterCreationSystem],
          Chunk.of(event)
        )
        yield* committer.commit(event, mutations)
      }

      // Verify character created
      const guido = yield* state.getEntity(guidoId)
      const guidoAttrs = getComponent(guido, "Attributes")
      expect(guidoAttrs?.strength).toBe(14)

      // Add CombatStats manually (characterCreationSystem doesn't create this yet)
      // TODO: characterCreationSystem should derive CombatStats from class/skills/attributes
      yield* store.update(guidoId, (entity) =>
        Effect.succeed(setComponent(
          entity,
          CombatStatsComponent.make({
            meleeAttackBonus: 4, // Primary MeleeCombat +2 + STR mod +2 (STR 14)
            rangedAttackBonus: 2, // Secondary Accuracy +1 + DEX mod +1 (DEX 12)
            armorClass: 11, // Base 10 + DEX mod +1 (DEX 12 = floor((12-10)/2) = +1)
            initiativeModifier: 0
          })
        )))

      const guidoHealth = getComponent(guido, "Health")
      expect(guidoHealth?.max).toBe(8) // 7 + 1 CON mod

      const guidoCurrency = getComponent(guido, "Currency")
      expect(guidoCurrency?.silver).toBe(110)

      // ========================================================================
      // PHASE 2: Enemy Encounter - Goblin Appears
      // ========================================================================

      const goblinDiscovery = CreatureDiscovered.make({
        name: "Goblin",
        strength: 10,
        dexterity: 14,
        constitution: 12,
        intelligence: 8,
        will: 10,
        charisma: 6,
        maxHP: 5,
        currentHP: 5,
        armorClass: 13,
        meleeAttackBonus: 2,
        rangedAttackBonus: 4,
        weaponName: "Short Sword",
        weaponDamageDice: "1d6",
        weaponGroup: "Blades",
        discoveredAt: null
      })

      const creatureMutations = yield* runSystemsPipeline(
        [creatureDiscoverySystem],
        Chunk.of(goblinDiscovery)
      )
      yield* committer.commit(goblinDiscovery, creatureMutations)

      // Get goblin entity ID from the mutation
      const createMutation = Chunk.toReadonlyArray(creatureMutations).find(
        m => m._tag === "CreateEntity"
      ) as { entity: { id: typeof EntityId.Type } } | undefined
      expect(createMutation).toBeDefined()
      const goblinId = createMutation!.entity.id

      // Verify goblin created
      const goblin = yield* state.getEntity(goblinId)
      const goblinHealth = getComponent(goblin, "Health")
      expect(goblinHealth?.current).toBe(5)
      expect(goblinHealth?.max).toBe(5)

      const goblinCombat = getComponent(goblin, "CombatStats")
      expect(goblinCombat?.armorClass).toBe(13)

      // ========================================================================
      // PHASE 3: Combat - Guido attacks Goblin with a longsword
      // ========================================================================

      // Create weapon entity with proper WeaponComponent
      const weaponId = EntityId.make(yield* idGen.generate())
      yield* store.set(Entity.make({
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
      }))

      // Attack event
      const guidoAttack = AttackPerformed.make({
        attackerId: guidoId,
        targetId: goblinId,
        weaponId,
        attackRoll: 15 // vs AC 13 → HIT
      })

      // Process combat
      const combatMutations = yield* runSystemsPipeline(
        [combatToHitSystem, traumaSystem],
        Chunk.of(guidoAttack)
      )

      // Should have damage mutation
      const damageMutation = Chunk.toReadonlyArray(combatMutations).find(
        m => m._tag === "DealDamage"
      )
      expect(damageMutation).toBeDefined()

      // Commit combat results
      yield* committer.commit(guidoAttack, combatMutations)

      // Check goblin took damage
      // Damage = 1d8 roll (5 from test layer) + STR modifier (+2 for STR 14) = 7
      // Goblin HP: 5 - 7 = -2
      const goblinAfterAttack = yield* state.getEntity(goblinId)
      const goblinHealthAfter = getComponent(goblinAfterAttack, "Health")
      expect(goblinHealthAfter!.current).toBe(-2) // 5 HP - 7 damage = -2 (dead)

      // ========================================================================
      // PHASE 4: Looting Currency
      // ========================================================================

      // First give goblin some currency to loot
      yield* store.update(goblinId, (entity) =>
        Effect.succeed(setComponent(
          entity,
          CurrencyComponent.make({
            copper: 0,
            silver: 12,
            gold: 0,
            platinum: 0
          })
        )))

      const lootCurrency = CurrencyTransferred.make({
        fromEntityId: goblinId,
        toEntityId: guidoId,
        copper: 0,
        silver: 12,
        gold: 0,
        platinum: 0
      })

      const currencyMutations = yield* runSystemsPipeline(
        [currencyTransferSystem],
        Chunk.of(lootCurrency)
      )
      yield* committer.commit(lootCurrency, currencyMutations)

      // Verify Guido got the silver
      const guidoAfterLoot = yield* state.getEntity(guidoId)
      const guidoCurrencyAfter = getComponent(guidoAfterLoot, "Currency")
      expect(guidoCurrencyAfter?.silver).toBe(122) // 110 + 12

      // ========================================================================
      // FINAL STATE VERIFICATION
      // ========================================================================

      const finalGuido = yield* state.getEntity(guidoId)

      // Health unchanged (goblin didn't hit back)
      const finalHealth = getComponent(finalGuido, "Health")
      expect(finalHealth?.current).toBe(8)

      // Currency increased
      const finalCurrency = getComponent(finalGuido, "Currency")
      expect(finalCurrency?.silver).toBe(122)

      // Success! Simulation completed: character creation → combat → looting
    }).pipe(
      Effect.provide(deterministicTestLayer([5, 5, 5])) // Deterministic dice rolls (damage = 5)
    ))
})
