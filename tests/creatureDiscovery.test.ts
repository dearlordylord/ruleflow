/**
 * Creature Discovery System tests
 *
 * Monsters in this system are minimal - just a name for narrative purposes.
 * They have no stats, HP, or weapons. The DM declares damage directly.
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
  it.effect("creates minimal creature entity from CreatureDiscovered event", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      // Create a goblin discovery event - just a name
      const goblinEvent = CreatureDiscovered.make({
        name: "Goblin",
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

      // Verify Creature component with name
      const creature = getComponent(entity, "Creature")
      expect(creature).toBeDefined()
      expect(creature?.name).toBe("Goblin")

      // Monsters don't have stats, health, weapons, etc.
      expect(getComponent(entity, "Attributes")).toBeUndefined()
      expect(getComponent(entity, "Health")).toBeUndefined()
      expect(getComponent(entity, "CombatStats")).toBeUndefined()
      expect(getComponent(entity, "Weapon")).toBeUndefined()
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("creates creature with discoveredAt reference", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      const roomId = EntityId.make("00000000-0000-0000-0000-000000000099")

      const goblinEvent = CreatureDiscovered.make({
        name: "Lurking Goblin",
        discoveredAt: roomId
      })

      const mutations = yield* creatureDiscoverySystem(
        state,
        Chunk.of(goblinEvent),
        Chunk.empty()
      )

      expect(Chunk.size(mutations)).toBe(1)
      const createMutation = Chunk.unsafeHead(mutations) as CreateEntityMutation
      expect(createMutation._tag).toBe("CreateEntity")

      const creature = getComponent(createMutation.entity, "Creature")
      expect(creature?.name).toBe("Lurking Goblin")
    }).pipe(Effect.provide(deterministicTestLayer([]))))

  it.effect("handles multiple creature discoveries in one batch", () =>
    Effect.gen(function*() {
      const state = yield* GameState

      const goblin1 = CreatureDiscovered.make({
        name: "Goblin Scout",
        discoveredAt: null
      })

      const goblin2 = CreatureDiscovered.make({
        name: "Goblin Warrior",
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

      // Both have Creature component with names
      expect(getComponent(first.entity, "Creature")?.name).toBe("Goblin Scout")
      expect(getComponent(second.entity, "Creature")?.name).toBe("Goblin Warrior")
    }).pipe(Effect.provide(deterministicTestLayer([]))))
})
