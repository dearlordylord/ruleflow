/**
 * Event Replay tests - verifying event sourcing architecture via Projector.replayAll
 *
 * All entity creation goes through events/observations so replayAll() can
 * reconstruct state from genesis (it calls readModelStore.clear() first).
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

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
import { EntityId, ObservationEntryId } from "../src/domain/entities.js"
import { getComponent } from "../src/domain/entity.js"
import { AttackPerformed, CreatureDiscovered, CurrencyTransferred } from "../src/domain/events.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ObservationEntry } from "../src/domain/infrastructure/ObservationLog.js"
import { Projector } from "../src/domain/infrastructure/Projector.js"
import { deterministicTestLayerWithIds } from "./layers.js"

/** Helper: wrap a domain event as a single-candidate ObservationEntry */
const makeObservation = (id: string, event: Parameters<typeof ObservationEntry.make>[0]["candidates"][0]["event"]) =>
  new ObservationEntry({
    id: ObservationEntryId.make(id),
    timestamp: new Date(),
    candidates: [{ event, confidence: 1.0 }],
    selectedIndex: null
  })

/** Observation ID counter for unique IDs within a test */
let obsCounter = 0
const nextObsId = () => {
  obsCounter++
  const hex = obsCounter.toString(16).padStart(12, "0")
  return `e0000000-0000-0000-0000-${hex}`
}
const resetObsCounter = () => {
  obsCounter = 0
}

describe("Event Replay", () => {
  it.effect("replays combat event to identical state", () =>
    Effect.gen(function*() {
      resetObsCounter()
      const state = yield* GameState
      const projector = yield* Projector

      // Create attacker via CreatureDiscovered (with weapon → Weapon component on entity)
      // IdGenerator pool [ID1, ID2] cycles: projection uses ID1, ID2; replay reuses ID1, ID2
      const attackerDiscovery = CreatureDiscovered.make({
        name: "Attacker",
        strength: 16,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        will: 10,
        charisma: 10,
        maxHP: 20,
        currentHP: 20,
        armorClass: 15,
        meleeAttackBonus: 2,
        rangedAttackBonus: 0,
        weaponName: "Longsword",
        weaponDamageDice: "1d8",
        weaponGroup: "Blades",
        discoveredAt: null
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), attackerDiscovery))

      const attackerId = EntityId.make("00000000-0000-0000-0000-000000000001")

      // Create target via CreatureDiscovered (no weapon needed)
      const targetDiscovery = CreatureDiscovered.make({
        name: "Target",
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        will: 10,
        charisma: 10,
        maxHP: 20,
        currentHP: 20,
        armorClass: 15,
        meleeAttackBonus: 0,
        rangedAttackBonus: 0,
        weaponName: null,
        weaponDamageDice: null,
        weaponGroup: null,
        discoveredAt: null
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), targetDiscovery))

      const targetId = EntityId.make("00000000-0000-0000-0000-000000000002")

      // Attack: use attackerId as weaponId (attacker entity has Weapon component)
      const attackEvent = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId: attackerId,
        attackRoll: 15
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), attackEvent))

      // Record state after projection
      const targetAfterProject = yield* state.getEntity(targetId)
      const healthAfterProject = getComponent(targetAfterProject, "Health")
      expect(healthAfterProject).toBeTruthy()

      // Replay from genesis — clears store, replays all observations
      yield* projector.replayAll()

      // Verify replayed state matches original
      const targetAfterReplay = yield* state.getEntity(targetId)
      const healthAfterReplay = getComponent(targetAfterReplay, "Health")

      expect(healthAfterReplay?.current).toBe(healthAfterProject?.current)
      expect(healthAfterReplay?.max).toBe(healthAfterProject?.max)
    }).pipe(Effect.provide(
      // Pool of 2 IDs: cycles so replay reproduces same entity IDs
      deterministicTestLayerWithIds(
        [5, 5], // Damage rolls for project + replay
        ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
      )
    )))

  it.effect("replays currency transfer event atomically", () =>
    Effect.gen(function*() {
      resetObsCounter()
      const state = yield* GameState
      const projector = yield* Projector

      // Create entities via CreatureDiscovered (so they exist after replayAll).
      // IdGenerator pool [ID1, ID2] cycles for replay correctness.
      const fromId = EntityId.make("00000000-0000-0000-0000-000000000001")
      const toId = EntityId.make("00000000-0000-0000-0000-000000000002")
      const playerId1 = EntityId.make("00000000-0000-0000-0000-000000000099")
      const playerId2 = EntityId.make("00000000-0000-0000-0000-000000000098")

      // Step 1: Create entities via CreatureDiscovered (produces CreateEntity mutations)
      // IdGenerator → ID1 for "from" entity
      yield* projector.projectLatest(makeObservation(
        nextObsId(),
        CreatureDiscovered.make({
          name: "Sender",
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10,
          maxHP: 6,
          currentHP: 6,
          armorClass: 10,
          meleeAttackBonus: 0,
          rangedAttackBonus: 0,
          weaponName: null,
          weaponDamageDice: null,
          weaponGroup: null,
          discoveredAt: null
        })
      ))

      // IdGenerator → ID2 for "to" entity
      yield* projector.projectLatest(makeObservation(
        nextObsId(),
        CreatureDiscovered.make({
          name: "Receiver",
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10,
          maxHP: 6,
          currentHP: 6,
          armorClass: 10,
          meleeAttackBonus: 0,
          rangedAttackBonus: 0,
          weaponName: null,
          weaponDamageDice: null,
          weaponGroup: null,
          discoveredAt: null
        })
      ))

      // Step 2: Character creation on existing entities to add Currency via
      // CharacterCreationStarted → ... → CharacterCreationCompleted flow
      const fromCharEvents = [
        CharacterCreationStarted.make({ entityId: fromId, playerId: playerId1, startingLevel: 1 }),
        AttributesRolled.make({
          entityId: fromId,
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10
        }),
        ClassChosen.make({ entityId: fromId, class: "Fighter" }),
        SkillsChosen.make({
          entityId: fromId,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        TraitChosen.make({ entityId: fromId, traitName: "Combat Reflexes" }),
        HitPointsRolled.make({ entityId: fromId, rolledValue: 6, constitutionModifier: 0 }),
        StartingMoneyRolled.make({ entityId: fromId, silverAmount: 100 }),
        AlignmentChosen.make({ entityId: fromId, alignment: "Neutral" }),
        NameChosen.make({ entityId: fromId, name: "Sender" }),
        CharacterCreationCompleted.make({ entityId: fromId })
      ]
      for (const event of fromCharEvents) {
        yield* projector.projectLatest(makeObservation(nextObsId(), event))
      }

      const toCharEvents = [
        CharacterCreationStarted.make({ entityId: toId, playerId: playerId2, startingLevel: 1 }),
        AttributesRolled.make({
          entityId: toId,
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10
        }),
        ClassChosen.make({ entityId: toId, class: "Fighter" }),
        SkillsChosen.make({
          entityId: toId,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        TraitChosen.make({ entityId: toId, traitName: "Combat Reflexes" }),
        HitPointsRolled.make({ entityId: toId, rolledValue: 6, constitutionModifier: 0 }),
        StartingMoneyRolled.make({ entityId: toId, silverAmount: 1 }),
        AlignmentChosen.make({ entityId: toId, alignment: "Neutral" }),
        NameChosen.make({ entityId: toId, name: "Receiver" }),
        CharacterCreationCompleted.make({ entityId: toId })
      ]
      for (const event of toCharEvents) {
        yield* projector.projectLatest(makeObservation(nextObsId(), event))
      }

      // Verify initial currency state
      const fromBefore = yield* state.getEntity(fromId)
      const fromCurrencyBefore = getComponent(fromBefore, "Currency")
      expect(fromCurrencyBefore?.silver).toBe(100)

      const toBefore = yield* state.getEntity(toId)
      const toCurrencyBefore = getComponent(toBefore, "Currency")
      expect(toCurrencyBefore?.silver).toBe(1)

      // Transfer currency
      const transferEvent = CurrencyTransferred.make({
        fromEntityId: fromId,
        toEntityId: toId,
        copper: 0,
        silver: 50,
        gold: 0,
        platinum: 0
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), transferEvent))

      // Record state after projection
      const fromAfterProject = yield* state.getEntity(fromId)
      const toAfterProject = yield* state.getEntity(toId)
      const fromCurrencyAfterProject = getComponent(fromAfterProject, "Currency")
      const toCurrencyAfterProject = getComponent(toAfterProject, "Currency")

      expect(fromCurrencyAfterProject?.silver).toBe(50)
      expect(toCurrencyAfterProject?.silver).toBe(51)

      // Replay from genesis
      yield* projector.replayAll()

      // Verify replayed state matches original
      const fromAfterReplay = yield* state.getEntity(fromId)
      const toAfterReplay = yield* state.getEntity(toId)
      const fromCurrencyAfterReplay = getComponent(fromAfterReplay, "Currency")
      const toCurrencyAfterReplay = getComponent(toAfterReplay, "Currency")

      expect(fromCurrencyAfterReplay?.silver).toBe(fromCurrencyAfterProject?.silver)
      expect(toCurrencyAfterReplay?.silver).toBe(toCurrencyAfterProject?.silver)
    }).pipe(Effect.provide(
      // Pool of 2 IDs: cycles so replay reproduces same entity IDs from CreatureDiscovered
      deterministicTestLayerWithIds(
        [],
        ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
      )
    )))

  it.effect("replays multiple events in sequence", () =>
    Effect.gen(function*() {
      resetObsCounter()
      const state = yield* GameState
      const projector = yield* Projector

      // Create attacker via CreatureDiscovered (with weapon)
      // IdGenerator pool [ID1, ID2] cycles: projection uses ID1, ID2; replay reuses ID1, ID2
      const attackerDiscovery = CreatureDiscovered.make({
        name: "Attacker",
        strength: 16,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        will: 10,
        charisma: 10,
        maxHP: 20,
        currentHP: 20,
        armorClass: 15,
        meleeAttackBonus: 2,
        rangedAttackBonus: 0,
        weaponName: "Longsword",
        weaponDamageDice: "1d8",
        weaponGroup: "Blades",
        discoveredAt: null
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), attackerDiscovery))

      const attackerId = EntityId.make("00000000-0000-0000-0000-000000000001")

      // Create target via CreatureDiscovered
      const targetDiscovery = CreatureDiscovered.make({
        name: "Target",
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        will: 10,
        charisma: 10,
        maxHP: 20,
        currentHP: 20,
        armorClass: 15,
        meleeAttackBonus: 0,
        rangedAttackBonus: 0,
        weaponName: null,
        weaponDamageDice: null,
        weaponGroup: null,
        discoveredAt: null
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), targetDiscovery))

      const targetId = EntityId.make("00000000-0000-0000-0000-000000000002")

      // Two attacks (weapon = attacker entity which has Weapon component)
      const attack1 = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId: attackerId,
        attackRoll: 15
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), attack1))

      const attack2 = AttackPerformed.make({
        attackerId,
        targetId,
        weaponId: attackerId,
        attackRoll: 18
      })
      yield* projector.projectLatest(makeObservation(nextObsId(), attack2))

      // Record final state
      const targetFinal = yield* state.getEntity(targetId)
      const healthFinal = getComponent(targetFinal, "Health")

      // Replay from genesis
      yield* projector.replayAll()

      // Verify replay produces identical state
      const targetReplayed = yield* state.getEntity(targetId)
      const healthReplayed = getComponent(targetReplayed, "Health")

      expect(healthReplayed?.current).toBe(healthFinal?.current)
    }).pipe(Effect.provide(
      // Pool of 2 IDs: cycles so replay reproduces same entity IDs
      deterministicTestLayerWithIds(
        [5, 6, 5, 6], // Damage rolls for 2 attacks * 2 (project + replay)
        ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
      )
    )))
})
