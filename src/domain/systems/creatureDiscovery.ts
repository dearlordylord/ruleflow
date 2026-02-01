/**
 * Creature Discovery System
 * Processes CreatureDiscovered events to create creature entities
 */
import { Chunk, Effect, Option, Schema } from "effect"

import { AttributesComponent } from "../character/attributes.js"
import { HealthComponent } from "../character/health.js"
import { CombatStatsComponent } from "../combat/stats.js"
import { DiceNotation, WeaponComponent } from "../combat/weapons.js"
import { EntityId } from "../entities.js"
import type { Component } from "../entity.js"
import { Entity } from "../entity.js"
import { CreateEntityMutation } from "../inventory/mutations.js"
import type { CreatureDiscovered } from "../npc/events.js"
import { IdGenerator } from "../services/IdGenerator.js"
import type { System } from "./types.js"

const VALID_WEAPON_GROUPS = [
  "Axes",
  "Blades",
  "HeavyBlades",
  "Bows",
  "Brawling",
  "Clubs",
  "Crossbows",
  "Flails",
  "Polearms",
  "Firearms",
  "Slings",
  "Spears",
  "Staves",
  "Thrown"
] as const

/**
 * Creates an optional weapon component from event data
 */
const createWeaponComponent = (
  weaponName: string | null,
  weaponDamageDice: string | null,
  weaponGroup: string | null
): Option.Option<WeaponComponent> => {
  if (!weaponName || !weaponDamageDice || !weaponGroup) {
    return Option.none()
  }

  const diceResult = Schema.decodeUnknownOption(DiceNotation)(weaponDamageDice)
  if (Option.isNone(diceResult)) {
    return Option.none()
  }

  // Default to "Brawling" if not a valid group
  const validatedGroup = VALID_WEAPON_GROUPS.includes(weaponGroup as typeof VALID_WEAPON_GROUPS[number])
    ? (weaponGroup as typeof VALID_WEAPON_GROUPS[number])
    : "Brawling"

  return Option.some(
    WeaponComponent.make({
      name: weaponName,
      damageDice: diceResult.value,
      damageType: ["Slashing"], // Default, creatures can override
      weaponGroup: validatedGroup,
      size: "Medium",
      traits: [],
      reach: 5,
      rangeClose: null,
      rangeMedium: null,
      rangeLong: null,
      durability: 10,
      maxDurability: 10
    })
  )
}

/**
 * Creature Discovery System
 * Processes CreatureDiscovered -> creates creature entity with components
 */
export const creatureDiscoverySystem: System<IdGenerator> = (_state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const idGen = yield* IdGenerator

    const creatureEvents = Chunk.filter(
      events,
      (event): event is CreatureDiscovered => event._tag === "CreatureDiscovered"
    )

    const mutations = yield* Effect.forEach(creatureEvents, (event) =>
      Effect.gen(function*() {
        // Generate new entity ID for creature using injected IdGenerator
        const creatureId = EntityId.make(yield* idGen.generate())

        // Build base components
        const baseComponents: ReadonlyArray<Component> = [
          AttributesComponent.make({
            strength: event.strength,
            dexterity: event.dexterity,
            constitution: event.constitution,
            intelligence: event.intelligence,
            will: event.will,
            charisma: event.charisma
          }),
          HealthComponent.make({
            current: event.currentHP,
            max: event.maxHP,
            traumaActive: false,
            traumaEffect: null
          }),
          CombatStatsComponent.make({
            meleeAttackBonus: event.meleeAttackBonus,
            rangedAttackBonus: event.rangedAttackBonus,
            armorClass: event.armorClass,
            initiativeModifier: 0
          })
        ]

        // Optionally add weapon component
        const weaponOption = createWeaponComponent(
          event.weaponName,
          event.weaponDamageDice,
          event.weaponGroup
        )

        const components = Option.match(weaponOption, {
          onNone: () => baseComponents,
          onSome: (weapon) => [...baseComponents, weapon]
        })

        // Create creature entity
        const creatureEntity = Entity.make({
          id: creatureId,
          components
        })

        return CreateEntityMutation.make({ entity: creatureEntity })
      }))

    return Chunk.fromIterable(mutations)
  })
