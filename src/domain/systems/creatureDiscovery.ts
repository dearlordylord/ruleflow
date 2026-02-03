/**
 * Creature Discovery System
 * Processes CreatureDiscovered events to create creature entities
 */
import { Chunk, Effect } from "effect"

import { EntityId } from "../entities.js"
import { Entity } from "../entity.js"
import { CreateEntityMutation } from "../inventory/mutations.js"
import { CreatureComponent } from "../npc/encounters.js"
import type { CreatureDiscovered } from "../npc/events.js"
import { IdGenerator } from "../services/IdGenerator.js"
import type { System } from "./types.js"

/**
 * Creature Discovery System
 * Processes CreatureDiscovered -> creates minimal creature entity
 *
 * Monsters in this system are minimal - just a name for narrative purposes.
 * They have no stats, HP, or weapons. The DM declares damage directly.
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
        // Generate new entity ID for creature
        const creatureId = EntityId.make(yield* idGen.generate())

        // Create minimal creature entity - just a name
        const creatureEntity = Entity.make({
          id: creatureId,
          components: [
            CreatureComponent.make({ name: event.name })
          ]
        })

        return CreateEntityMutation.make({ entity: creatureEntity })
      }))

    return Chunk.fromIterable(mutations)
  })
