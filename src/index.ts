/**
 * Example: Combat sequence
 */
import { Effect, HashMap, Chunk } from "effect"
import { EntityId } from "./domain/entities.js"
import {
  Entity,
  AttributesComponent,
  HealthComponent,
  CombatStatsComponent,
  WeaponComponent
} from "./domain/components.js"
import { PerformAttackMutation } from "./domain/mutations.js"
import { ReadModelStore } from "./domain/infrastructure/ReadModelStore.js"
import { Committer } from "./domain/infrastructure/Committer.js"
import { GameState } from "./domain/infrastructure/GameState.js"
import { DiceRoller } from "./domain/services/DiceRoller.js"
import { CombatResolver } from "./domain/services/CombatResolver.js"
import { combatToHitSystem, traumaSystem, runSystemsPipeline } from "./domain/systems/index.js"
import { testLayer } from "./domain/infrastructure/layers.js"

const program = Effect.gen(function* () {
  const committer = yield* Committer
  const state = yield* GameState
  const store = yield* ReadModelStore

  // Create fighter
  const fighterId = EntityId.make(crypto.randomUUID())
  yield* store.set(
    Entity.make({
      id: fighterId,
      components: HashMap.make(
        ["Attributes", AttributesComponent.make({
          strength: 16,
          dexterity: 14,
          intelligence: 10,
          will: 10,
          constitution: 12,
          charisma: 10
        })] as const,
        ["CombatStats", CombatStatsComponent.make({
          meleeAttackBonus: 3,
          rangedAttackBonus: 1,
          armorClass: 15
        })] as const,
        ["Health", HealthComponent.make({
          current: 25,
          max: 25,
          traumaActive: false,
          traumaEffect: null
        })] as const
      )
    })
  )

  // Create enemy
  const enemyId = EntityId.make(crypto.randomUUID())
  yield* store.set(
    Entity.make({
      id: enemyId,
      components: HashMap.make(
        ["CombatStats", CombatStatsComponent.make({
          meleeAttackBonus: 1,
          rangedAttackBonus: 0,
          armorClass: 13
        })] as const,
        ["Health", HealthComponent.make({
          current: 10,
          max: 10,
          traumaActive: false,
          traumaEffect: null
        })] as const
      )
    })
  )

  // Create longsword
  const swordId = EntityId.make(crypto.randomUUID())
  yield* store.set(
    Entity.make({
      id: swordId,
      components: HashMap.make(
        ["Weapon", WeaponComponent.make({
          name: "Longsword",
          damageDice: "1d8",
          weaponGroup: "Blades",
          traits: []
        })] as const
      )
    })
  )

  yield* Effect.logInfo("=== Combat Sequence ===")

  const fighter = yield* state.getEntity(fighterId)
  const fighterAttrs = HashMap.get(fighter.components, "Attributes")
  yield* Effect.logInfo(
    `Fighter (STR ${
      Option.isSome(fighterAttrs) && fighterAttrs.value instanceof AttributesComponent
        ? fighterAttrs.value.strength
        : "?"
    })`
  )

  // Attack roll: 15 + 3 (bonus) + 3 (STR mod) = 21 vs AC 13
  const attackMutation = PerformAttackMutation.make({
    attackerId: fighterId,
    targetId: enemyId,
    weaponId: swordId,
    attackRoll: 15,
    isCritical: false
  })

  // Run systems pipeline
  const systems = [combatToHitSystem, traumaSystem]
  const initialMutations = Chunk.of(attackMutation)

  const mutations = yield* runSystemsPipeline(systems, initialMutations)

  const result = yield* committer.commit(mutations)

  yield* Effect.logInfo(`Committed entry ${result.id}`)

  const enemyAfter = yield* state.getEntity(enemyId)
  const healthAfter = HashMap.get(enemyAfter.components, "Health")
  if (Option.isSome(healthAfter) && healthAfter.value instanceof HealthComponent) {
    yield* Effect.logInfo(
      `Enemy HP: ${healthAfter.value.current}/${healthAfter.value.max} (Trauma: ${healthAfter.value.traumaActive})`
    )
  }
})

import { Layer, Option } from "effect"

const fullLayer = Layer.mergeAll(
  testLayer,
  DiceRoller.testLayer([6, 3]), // 6 for damage, 3 for crit damage
  CombatResolver.layer.pipe(Layer.provide(DiceRoller.testLayer([6, 3])))
)

Effect.runPromise(program.pipe(Effect.provide(fullLayer)))
