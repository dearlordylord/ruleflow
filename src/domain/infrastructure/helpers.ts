/**
 * Helper functions for mutations to components
 */
import { Effect } from "effect"

import { Entity, getComponent, Component } from "../entity.js"
import {
  AttributesComponent,
  CharacterCreationComponent,
  SkillsComponent,
  SavingThrowsComponent,
  Skill
} from "../character/index.js"
import { HealthComponent, ClassComponent } from "../character/index.js"
import { InventoryComponent } from "../inventory/items.js"
import type { EntityId } from "../entities.js"
import type { EntityNotFound } from "../errors.js"
import type { Mutation } from "../mutations.js"

export function createComponentFromMutation(
  mutation: Mutation,
  store: {
    readonly get: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly set: (entity: Entity) => Effect.Effect<void>
    readonly update: (
      id: EntityId,
      f: (entity: Entity) => Effect.Effect<Entity>
    ) => Effect.Effect<void, EntityNotFound>
  }
): Effect.Effect<Component, never> {
  if (mutation._tag === "SetAttributes") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Attributes")
      const base = existing instanceof AttributesComponent
        ? existing
        : AttributesComponent.make({
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          will: 10,
          constitution: 10,
          charisma: 10
        })

      return AttributesComponent.make({
        strength: mutation.data.strength ?? base.strength,
        dexterity: mutation.data.dexterity ?? base.dexterity,
        intelligence: mutation.data.intelligence ?? base.intelligence,
        will: mutation.data.will ?? base.will,
        constitution: mutation.data.constitution ?? base.constitution,
        charisma: mutation.data.charisma ?? base.charisma
      })
    })
  }

  if (mutation._tag === "SetHealth") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Health")
      const base = existing instanceof HealthComponent
        ? existing
        : HealthComponent.make({
          current: 10,
          max: 10,
          traumaActive: false,
          traumaEffect: null
        })

      return HealthComponent.make({
        current: mutation.data.current ?? base.current,
        max: mutation.data.max ?? base.max,
        traumaActive: mutation.data.traumaActive ?? base.traumaActive,
        traumaEffect: mutation.data.traumaEffect ?? base.traumaEffect
      })
    })
  }

  if (mutation._tag === "SetClass") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Class")
      const base = existing instanceof ClassComponent
        ? existing
        : ClassComponent.make({ class: "Fighter", level: 1 })

      return ClassComponent.make({
        class: mutation.data.class ?? base.class,
        level: mutation.data.level ?? base.level
      })
    })
  }

  if (mutation._tag === "SetSkills") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Skills")

      const defaultSkill = Skill.make({
        proficiency: "Untrained",
        levelBonus: 0
      })

      const base = existing instanceof SkillsComponent
        ? existing
        : SkillsComponent.make({
            melee: defaultSkill,
            might: defaultSkill,
            accuracy: defaultSkill,
            movement: defaultSkill,
            sleightOfHand: defaultSkill,
            stealth: defaultSkill,
            alchemy: defaultSkill,
            craft: defaultSkill,
            knowledge: defaultSkill,
            medicine: defaultSkill,
            awareness: defaultSkill,
            survival: defaultSkill,
            occultism: defaultSkill,
            performance: defaultSkill,
            animalHandling: defaultSkill
          })

      return SkillsComponent.make({
        melee: mutation.data.melee ?? base.melee,
        might: mutation.data.might ?? base.might,
        accuracy: mutation.data.accuracy ?? base.accuracy,
        movement: mutation.data.movement ?? base.movement,
        sleightOfHand: mutation.data.sleightOfHand ?? base.sleightOfHand,
        stealth: mutation.data.stealth ?? base.stealth,
        alchemy: mutation.data.alchemy ?? base.alchemy,
        craft: mutation.data.craft ?? base.craft,
        knowledge: mutation.data.knowledge ?? base.knowledge,
        medicine: mutation.data.medicine ?? base.medicine,
        awareness: mutation.data.awareness ?? base.awareness,
        survival: mutation.data.survival ?? base.survival,
        occultism: mutation.data.occultism ?? base.occultism,
        performance: mutation.data.performance ?? base.performance,
        animalHandling: mutation.data.animalHandling ?? base.animalHandling
      })
    })
  }

  if (mutation._tag === "SetSavingThrows") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "SavingThrows")
      const base = existing instanceof SavingThrowsComponent
        ? existing
        : SavingThrowsComponent.make({
            baseSaveBonus: 0,
            restraintModifier: 0,
            exhaustionModifier: 0,
            dodgeModifier: 0,
            suppressionModifier: 0,
            confusionModifier: 0,
            curseModifier: 0
          })

      return SavingThrowsComponent.make({
        baseSaveBonus: mutation.data.baseSaveBonus ?? base.baseSaveBonus,
        restraintModifier: mutation.data.restraintModifier ?? base.restraintModifier,
        exhaustionModifier: mutation.data.exhaustionModifier ?? base.exhaustionModifier,
        dodgeModifier: mutation.data.dodgeModifier ?? base.dodgeModifier,
        suppressionModifier: mutation.data.suppressionModifier ?? base.suppressionModifier,
        confusionModifier: mutation.data.confusionModifier ?? base.confusionModifier,
        curseModifier: mutation.data.curseModifier ?? base.curseModifier
      })
    })
  }

  if (mutation._tag === "AddItem") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Inventory")
      const base = existing instanceof InventoryComponent
        ? existing
        : InventoryComponent.make({
          items: [],
          loadCapacity: 50,
          currentLoad: 0
        })

      return InventoryComponent.make({
        items: [...base.items, mutation.itemId],
        loadCapacity: base.loadCapacity,
        currentLoad: base.currentLoad // Will be updated by encumbrance system
      })
    })
  }

  if (mutation._tag === "RemoveItem") {
    return Effect.gen(function*() {
      const entity = yield* store.get(mutation.entityId).pipe(
        Effect.orElseSucceed(() =>
          Entity.make({
            id: mutation.entityId,
            components: []
          })
        )
      )
      const existing = getComponent(entity, "Inventory")
      const base = existing instanceof InventoryComponent
        ? existing
        : InventoryComponent.make({
          items: [],
          loadCapacity: 50,
          currentLoad: 0
        })

      return InventoryComponent.make({
        items: base.items.filter(id => id !== mutation.itemId),
        loadCapacity: base.loadCapacity,
        currentLoad: base.currentLoad // Will be updated by encumbrance system
      })
    })
  }

  if (mutation._tag === "DebitCurrency" || mutation._tag === "CreditCurrency") {
    // These mutations are handled directly in GameState.applyMutation
    return Effect.die(`DebitCurrency/CreditCurrency should not reach createComponentFromMutation`)
  }

  if (
    mutation._tag === "DealDamage" ||
    mutation._tag === "RemoveComponent" ||
    mutation._tag === "SetMultipleComponents" ||
    mutation._tag === "UpdateCharacterCreation"
  ) {
    // These mutations are handled directly in GameState.applyMutation
    return Effect.die(`${mutation._tag} should not reach createComponentFromMutation`)
  }

  // Should never reach here - only called for mutations that create components
  return Effect.die(`Unexpected mutation type in createComponentFromMutation`)
}
