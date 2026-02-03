/**
 * Full Game Simulation Test
 *
 * Demonstrates event sourcing flow:
 * 1. Character creation (Guido the Fighter)
 * 2. Enemy encounter (goblin appears - just a name, no stats)
 * 3. Combat (Guido attacks goblin - no mechanical resolution against monsters)
 * 4. Looting (currency from goblin)
 *
 * Note: Monsters in this system are minimal - just names for narrative purposes.
 * The DM declares damage directly. Combat resolution only works between characters.
 */
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, HashMap, Option } from "effect"

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
} from "../src/domain/character/creationEvents.js"
import { CombatStatsComponent } from "../src/domain/combat/stats.js"
import { EntityId } from "../src/domain/entities.js"
import { Entity, getComponent, setComponent } from "../src/domain/entity.js"
import { CreatureDiscovered, CurrencyTransferred } from "../src/domain/events.js"
import { Committer } from "../src/domain/infrastructure/Committer.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { CurrencyComponent } from "../src/domain/inventory/currency.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import {
  characterCreationSystem,
  creatureDiscoverySystem,
  currencyTransferSystem,
  runSystemsPipeline
} from "../src/domain/systems/index.js"
import { deterministicTestLayer } from "./layers.js"

describe("Full Game Simulation", () => {
  it.effect("simulates character creation -> encounter -> looting flow", () =>
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
        // Fighter class ability: weapon group specialization (HeavyBlades for longsword)
        WeaponGroupSpecializationChosen.make({ entityId: guidoId, weaponGroup: "HeavyBlades" }),
        SkillsChosen.make({
          entityId: guidoId,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        // Trait at level 1 (Combat Reflexes has no requirements)
        TraitChosen.make({ entityId: guidoId, traitName: "Combat Reflexes" }),
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

      // Verify weapon specialization was applied (Fighter class ability)
      const guidoAfterSpec = yield* state.getEntity(guidoId)
      const guidoSpec = getComponent(guidoAfterSpec, "WeaponSpecialization")
      expect(guidoSpec).toBeDefined()
      // Verify HeavyBlades specialization has +1 bonus
      const heavyBladesBonus = HashMap.get(guidoSpec!.specializations, "HeavyBlades")
      expect(Option.isSome(heavyBladesBonus)).toBe(true)
      expect(Option.getOrElse(heavyBladesBonus, () => 0)).toBe(1)

      // ========================================================================
      // PHASE 2: Enemy Encounter - Goblin Appears
      // Monsters are minimal - just a name for narrative purposes
      // ========================================================================

      const goblinDiscovery = CreatureDiscovered.make({
        name: "Goblin",
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

      // Verify goblin created with minimal Creature component (just name)
      const goblin = yield* state.getEntity(goblinId)
      const goblinCreature = getComponent(goblin, "Creature")
      expect(goblinCreature?.name).toBe("Goblin")

      // Monsters don't have Health, CombatStats, etc.
      expect(getComponent(goblin, "Health")).toBeUndefined()
      expect(getComponent(goblin, "CombatStats")).toBeUndefined()

      // ========================================================================
      // PHASE 3: Looting Currency
      // (Combat is DM-declared in this system - no mechanical attack resolution
      // against monsters. DM says "you kill it", then looting happens.)
      // ========================================================================

      // Give goblin some currency to loot (DM decides what's on the body)
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

      // Health unchanged (no combat damage in this test)
      const finalHealth = getComponent(finalGuido, "Health")
      expect(finalHealth?.current).toBe(8)

      // Currency increased
      const finalCurrency = getComponent(finalGuido, "Currency")
      expect(finalCurrency?.silver).toBe(122)

      // Success! Simulation completed: character creation → encounter → looting
    }).pipe(
      Effect.provide(deterministicTestLayer([5, 5, 5])) // Deterministic dice rolls
    ))
})
