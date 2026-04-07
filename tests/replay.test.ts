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
  TraitChosen,
  WeaponGroupSpecializationChosen
} from "../src/domain/character/creationEvents.js"
import { EntityId } from "../src/domain/entities.js"
import { getComponent } from "../src/domain/entity.js"
import { CreatureDiscovered, CurrencyTransferred } from "../src/domain/events.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { Projector } from "../src/domain/infrastructure/Projector.js"
import { deterministicTestLayerWithIds, makeObservation } from "./layers.js"

describe("Event Replay", () => {
  it.effect("replays character creation to identical state", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const projector = yield* Projector

      // Create entity shell via CreatureDiscovered (goes into ObservationLog → survives replayAll)
      // IdGenerator pool [ID1] cycles: projection uses ID1; replay reuses ID1
      yield* projector.projectLatest(makeObservation(
        CreatureDiscovered.make({ name: "Guido", discoveredAt: null })
      ))

      const guidoId = EntityId.make("00000000-0000-0000-0000-000000000001")

      // Run character creation on the entity
      const charEvents = [
        CharacterCreationStarted.make({
          entityId: guidoId,
          playerId: EntityId.make("00000000-0000-0000-0000-000000000099"),
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
      for (const event of charEvents) {
        yield* projector.projectLatest(makeObservation(event))
      }

      // Record state after projection
      const guidoAfterProject = yield* state.getEntity(guidoId)
      const healthAfterProject = getComponent(guidoAfterProject, "Health")
      const currencyAfterProject = getComponent(guidoAfterProject, "Currency")
      expect(healthAfterProject?.max).toBe(8) // 7 + 1 CON mod

      // Replay from genesis — clears store, replays all observations
      yield* projector.replayAll()

      // Verify replayed state matches original
      const guidoAfterReplay = yield* state.getEntity(guidoId)
      const healthAfterReplay = getComponent(guidoAfterReplay, "Health")
      const currencyAfterReplay = getComponent(guidoAfterReplay, "Currency")

      expect(healthAfterReplay?.current).toBe(healthAfterProject?.current)
      expect(healthAfterReplay?.max).toBe(healthAfterProject?.max)
      expect(currencyAfterReplay?.silver).toBe(currencyAfterProject?.silver)
    }).pipe(Effect.provide(
      deterministicTestLayerWithIds(
        [],
        ["00000000-0000-0000-0000-000000000001"]
      )
    )))

  it.effect("replays currency transfer event atomically", () =>
    Effect.gen(function*() {
      const state = yield* GameState
      const projector = yield* Projector

      // Create entities via CreatureDiscovered (so they exist after replayAll).
      // IdGenerator pool [ID1, ID2] cycles for replay correctness.
      const fromId = EntityId.make("00000000-0000-0000-0000-000000000001")
      const toId = EntityId.make("00000000-0000-0000-0000-000000000002")
      const playerId1 = EntityId.make("00000000-0000-0000-0000-000000000099")
      const playerId2 = EntityId.make("00000000-0000-0000-0000-000000000098")

      // Step 1: Create entities via CreatureDiscovered (produces CreateEntity mutations)
      yield* projector.projectLatest(makeObservation(
        CreatureDiscovered.make({ name: "Sender", discoveredAt: null })
      ))

      yield* projector.projectLatest(makeObservation(
        CreatureDiscovered.make({ name: "Receiver", discoveredAt: null })
      ))

      // Step 2: Character creation on existing entities to add Currency via events
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
        yield* projector.projectLatest(makeObservation(event))
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
        yield* projector.projectLatest(makeObservation(event))
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
      yield* projector.projectLatest(makeObservation(transferEvent))

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
      const state = yield* GameState
      const projector = yield* Projector

      // Create two characters via full character creation
      // IdGenerator pool [ID1, ID2] cycles for replay correctness
      const char1Id = EntityId.make("00000000-0000-0000-0000-000000000001")
      const char2Id = EntityId.make("00000000-0000-0000-0000-000000000002")

      yield* projector.projectLatest(makeObservation(
        CreatureDiscovered.make({ name: "Char1", discoveredAt: null })
      ))
      yield* projector.projectLatest(makeObservation(
        CreatureDiscovered.make({ name: "Char2", discoveredAt: null })
      ))

      const char1Events = [
        CharacterCreationStarted.make({
          entityId: char1Id,
          playerId: EntityId.make("00000000-0000-0000-0000-000000000099"),
          startingLevel: 1
        }),
        AttributesRolled.make({
          entityId: char1Id,
          strength: 12,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10
        }),
        ClassChosen.make({ entityId: char1Id, class: "Fighter" }),
        SkillsChosen.make({
          entityId: char1Id,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        TraitChosen.make({ entityId: char1Id, traitName: "Combat Reflexes" }),
        HitPointsRolled.make({ entityId: char1Id, rolledValue: 8, constitutionModifier: 0 }),
        StartingMoneyRolled.make({ entityId: char1Id, silverAmount: 200 }),
        AlignmentChosen.make({ entityId: char1Id, alignment: "Neutral" }),
        NameChosen.make({ entityId: char1Id, name: "Char1" }),
        CharacterCreationCompleted.make({ entityId: char1Id })
      ]
      for (const event of char1Events) {
        yield* projector.projectLatest(makeObservation(event))
      }

      const char2Events = [
        CharacterCreationStarted.make({
          entityId: char2Id,
          playerId: EntityId.make("00000000-0000-0000-0000-000000000098"),
          startingLevel: 1
        }),
        AttributesRolled.make({
          entityId: char2Id,
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          will: 10,
          charisma: 10
        }),
        ClassChosen.make({ entityId: char2Id, class: "Fighter" }),
        SkillsChosen.make({
          entityId: char2Id,
          primarySkills: ["MeleeCombat", "Accuracy"],
          secondarySkills: ["Awareness", "Survival", "Medicine"]
        }),
        TraitChosen.make({ entityId: char2Id, traitName: "Combat Reflexes" }),
        HitPointsRolled.make({ entityId: char2Id, rolledValue: 6, constitutionModifier: 0 }),
        StartingMoneyRolled.make({ entityId: char2Id, silverAmount: 50 }),
        AlignmentChosen.make({ entityId: char2Id, alignment: "Neutral" }),
        NameChosen.make({ entityId: char2Id, name: "Char2" }),
        CharacterCreationCompleted.make({ entityId: char2Id })
      ]
      for (const event of char2Events) {
        yield* projector.projectLatest(makeObservation(event))
      }

      // Transfer currency from char1 to char2 (twice)
      const transfer1 = CurrencyTransferred.make({
        fromEntityId: char1Id,
        toEntityId: char2Id,
        copper: 0,
        silver: 30,
        gold: 0,
        platinum: 0
      })
      yield* projector.projectLatest(makeObservation(transfer1))

      const transfer2 = CurrencyTransferred.make({
        fromEntityId: char1Id,
        toEntityId: char2Id,
        copper: 0,
        silver: 20,
        gold: 0,
        platinum: 0
      })
      yield* projector.projectLatest(makeObservation(transfer2))

      // Record final state
      const char1Final = yield* state.getEntity(char1Id)
      const char2Final = yield* state.getEntity(char2Id)
      const char1CurrencyFinal = getComponent(char1Final, "Currency")
      const char2CurrencyFinal = getComponent(char2Final, "Currency")

      expect(char1CurrencyFinal?.silver).toBe(150) // 200 - 30 - 20
      expect(char2CurrencyFinal?.silver).toBe(100) // 50 + 30 + 20

      // Replay from genesis
      yield* projector.replayAll()

      // Verify replay produces identical state
      const char1Replayed = yield* state.getEntity(char1Id)
      const char2Replayed = yield* state.getEntity(char2Id)

      expect(getComponent(char1Replayed, "Currency")?.silver).toBe(char1CurrencyFinal?.silver)
      expect(getComponent(char2Replayed, "Currency")?.silver).toBe(char2CurrencyFinal?.silver)
    }).pipe(Effect.provide(
      deterministicTestLayerWithIds(
        [],
        ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
      )
    )))
})
