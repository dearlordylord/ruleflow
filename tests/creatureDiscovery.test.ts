/**
 * Creature Discovery System tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect } from "effect"

import { EntityId } from "../src/domain/entities.js"
import { getComponent } from "../src/domain/entity.js"
import { CreatureDiscovered } from "../src/domain/events.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import type { CreateEntityMutation } from "../src/domain/inventory/mutations.js"
import { creatureDiscoverySystem } from "../src/domain/systems/index.js"
import { deterministicTestLayer } from "./layers.js"

describe("Creature Discovery System", () => {
  it.effect("creates creature entity with correct components from CreatureDiscovered event", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      // Create a goblin discovery event
      const goblinEvent = CreatureDiscovered.make({
        name: "Goblin",
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 8,
        will: 8,
        charisma: 6,
        maxHP: 7,
        currentHP: 7,
        armorClass: 13,
        meleeAttackBonus: 1,
        rangedAttackBonus: 2,
        weaponName: "Rusty Shortsword",
        weaponDamageDice: "1d6",
        weaponGroup: "Blades",
        discoveredAt: null
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.of(goblinEvent),
        Chunk.empty()
      )

      // Should produce exactly one CreateEntity mutation
      expect(Chunk.size(mutations)).toBe(1)

      const createMutation = Chunk.unsafeHead(mutations) as CreateEntityMutation
      expect(createMutation._tag).toBe("CreateEntity")

      const entity = createMutation.entity

      // Verify Attributes component
      const attrs = getComponent(entity, "Attributes")
      expect(attrs).toBeDefined()
      expect(attrs?.strength).toBe(8)
      expect(attrs?.dexterity).toBe(14)
      expect(attrs?.constitution).toBe(10)
      expect(attrs?.intelligence).toBe(8)
      expect(attrs?.will).toBe(8)
      expect(attrs?.charisma).toBe(6)

      // Verify Health component
      const health = getComponent(entity, "Health")
      expect(health).toBeDefined()
      expect(health?.current).toBe(7)
      expect(health?.max).toBe(7)
      expect(health?.traumaActive).toBe(false)
      expect(health?.traumaEffect).toBeNull()

      // Verify CombatStats component
      const combat = getComponent(entity, "CombatStats")
      expect(combat).toBeDefined()
      expect(combat?.armorClass).toBe(13)
      expect(combat?.meleeAttackBonus).toBe(1)
      expect(combat?.rangedAttackBonus).toBe(2)
      expect(combat?.initiativeModifier).toBe(0)

      // Verify Weapon component
      const weapon = getComponent(entity, "Weapon")
      expect(weapon).toBeDefined()
      expect(weapon?.name).toBe("Rusty Shortsword")
      expect(weapon?.damageDice).toBe("1d6")
      expect(weapon?.weaponGroup).toBe("Blades")
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("creates creature without weapon when weapon info is null", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      // Create a creature without weapon
      const skeletonEvent = CreatureDiscovered.make({
        name: "Skeleton",
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 6,
        will: 10,
        charisma: 5,
        maxHP: 13,
        currentHP: 13,
        armorClass: 13,
        meleeAttackBonus: 2,
        rangedAttackBonus: 0,
        weaponName: null,
        weaponDamageDice: null,
        weaponGroup: null,
        discoveredAt: null
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.of(skeletonEvent),
        Chunk.empty()
      )

      expect(Chunk.size(mutations)).toBe(1)

      const createMutation = Chunk.unsafeHead(mutations) as CreateEntityMutation
      const entity = createMutation.entity

      // Should have Attributes, Health, CombatStats but no Weapon
      expect(getComponent(entity, "Attributes")).toBeDefined()
      expect(getComponent(entity, "Health")).toBeDefined()
      expect(getComponent(entity, "CombatStats")).toBeDefined()
      expect(getComponent(entity, "Weapon")).toBeUndefined()
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("creates creature with discoveredAt reference", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      const roomId = EntityId.make("00000000-0000-0000-0000-000000000099")

      const goblinEvent = CreatureDiscovered.make({
        name: "Lurking Goblin",
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 8,
        will: 8,
        charisma: 6,
        maxHP: 7,
        currentHP: 7,
        armorClass: 13,
        meleeAttackBonus: 1,
        rangedAttackBonus: 2,
        weaponName: null,
        weaponDamageDice: null,
        weaponGroup: null,
        discoveredAt: roomId
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.of(goblinEvent),
        Chunk.empty()
      )

      // System creates the entity; discoveredAt is event metadata
      // The creature entity itself doesn't store discoveredAt (could add PositionComponent later)
      expect(Chunk.size(mutations)).toBe(1)
      const createMutation = Chunk.unsafeHead(mutations) as CreateEntityMutation
      expect(createMutation._tag).toBe("CreateEntity")
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("handles multiple creature discoveries in one batch", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      const goblin1 = CreatureDiscovered.make({
        name: "Goblin Scout",
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 8,
        will: 8,
        charisma: 6,
        maxHP: 7,
        currentHP: 7,
        armorClass: 13,
        meleeAttackBonus: 1,
        rangedAttackBonus: 2,
        weaponName: null,
        weaponDamageDice: null,
        weaponGroup: null,
        discoveredAt: null
      })

      const goblin2 = CreatureDiscovered.make({
        name: "Goblin Warrior",
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 8,
        will: 8,
        charisma: 6,
        maxHP: 11,
        currentHP: 11,
        armorClass: 15,
        meleeAttackBonus: 3,
        rangedAttackBonus: 0,
        weaponName: "Scimitar",
        weaponDamageDice: "1d6",
        weaponGroup: "Blades",
        discoveredAt: null
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.make(goblin1, goblin2),
        Chunk.empty()
      )

      // Should create two separate creature entities
      expect(Chunk.size(mutations)).toBe(2)

      const [first, second] = Chunk.toArray(mutations) as Array<CreateEntityMutation>

      expect(first._tag).toBe("CreateEntity")
      expect(second._tag).toBe("CreateEntity")

      // Different entity IDs
      expect(first.entity.id).not.toBe(second.entity.id)

      // First goblin has no weapon
      expect(getComponent(first.entity, "Weapon")).toBeUndefined()

      // Second goblin has weapon
      const weapon = getComponent(second.entity, "Weapon")
      expect(weapon).toBeDefined()
      expect(weapon?.name).toBe("Scimitar")
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("defaults to Brawling weapon group for invalid weapon group", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      const event = CreatureDiscovered.make({
        name: "Strange Creature",
        strength: 12,
        dexterity: 10,
        constitution: 12,
        intelligence: 4,
        will: 6,
        charisma: 4,
        maxHP: 15,
        currentHP: 15,
        armorClass: 12,
        meleeAttackBonus: 2,
        rangedAttackBonus: 0,
        weaponName: "Natural Claws",
        weaponDamageDice: "1d4",
        weaponGroup: "InvalidGroup", // Not a valid weapon group
        discoveredAt: null
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.of(event),
        Chunk.empty()
      )

      const createMutation = Chunk.unsafeHead(mutations) as CreateEntityMutation
      const weapon = getComponent(createMutation.entity, "Weapon")

      expect(weapon).toBeDefined()
      expect(weapon?.weaponGroup).toBe("Brawling") // Defaults to Brawling
    }).pipe(Effect.provide(deterministicTestLayer([]))))
})
