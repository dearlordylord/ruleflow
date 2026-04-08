import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"

import { CombatStatsComponent } from "../src/domain/combat/stats.js"
import { DiceNotation, WeaponComponent } from "../src/domain/combat/weapons.js"
import { EntityId } from "../src/domain/entities.js"
import { Entity } from "../src/domain/entity.js"
import { ObservationLog } from "../src/domain/infrastructure/ObservationLog.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { MovementComponent } from "../src/domain/world/movement.js"
import type { InterpretationContext } from "../src/transcript/index.js"
import {
  TranscriptInterpreter,
  TranscriptPipeline,
  TranscriptSegment,
  TranscriptStream,
  TranscriptStreamConfig
} from "../src/transcript/index.js"
import { deterministicTestLayer } from "./layers.js"

const GUIDO_ID = EntityId.make("00000000-0000-0000-0000-000000000001")
const SWORD_ID = EntityId.make("00000000-0000-0000-0000-000000000010")
const GOBLIN_ID = EntityId.make("00000000-0000-0000-0000-000000000020")
const ORC_ID = EntityId.make("00000000-0000-0000-0000-000000000021")

const singleTargetContext: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" }
  ],
  activeCharacterId: GUIDO_ID,
  activeWeaponId: SWORD_ID
}

const multiTargetContext: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" },
    { id: ORC_ID, name: "Orc", type: "creature" }
  ],
  activeCharacterId: GUIDO_ID,
  activeWeaponId: SWORD_ID
}

const humanMovement = MovementComponent.make({
  baseSpeed: 30,
  currentSpeed: 30,
  armorPenalty: 0,
  encumbrancePenalty: 0,
  canFly: false,
  flySpeed: null,
  canSwim: false,
  swimSpeed: null,
  canClimb: false,
  climbSpeed: null
})

function characterEntity(id: EntityId): Entity {
  return Entity.make({ id, components: [humanMovement] })
}

function combatantEntity(id: EntityId, armorClass: number, meleeAttackBonus: number): Entity {
  return Entity.make({
    id,
    components: [
      CombatStatsComponent.make({
        meleeAttackBonus,
        rangedAttackBonus: 1,
        armorClass,
        initiativeModifier: 0
      })
    ]
  })
}

function weaponEntity(id: EntityId): Entity {
  return Entity.make({
    id,
    components: [
      WeaponComponent.make({
        name: "Longsword",
        damageDice: Schema.decodeSync(DiceNotation)("1d8"),
        damageType: ["Slashing"],
        weaponGroup: "HeavyBlades",
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
  })
}

function seedScene(): Effect.Effect<void, never, ReadModelStore> {
  return Effect.gen(function*() {
    const store = yield* ReadModelStore
    yield* store.set(characterEntity(GUIDO_ID))
    yield* store.set(combatantEntity(GOBLIN_ID, 12, 2))
    yield* store.set(combatantEntity(ORC_ID, 13, 3))
    yield* store.set(weaponEntity(SWORD_ID))
  })
}

function seg(text: string, iso: string): TranscriptSegment {
  return new TranscriptSegment({
    text: Schema.decodeSync(Schema.NonEmptyString)(text),
    timestamp: new Date(iso),
    speakerHint: "player"
  })
}

const transcriptStreamTestLayer = (rolls: Array<number>) => {
  const base = deterministicTestLayer(rolls)
  const pipelineLayer = TranscriptPipeline.layer.pipe(
    Layer.provide(Layer.mergeAll(base, TranscriptInterpreter.mockLayer))
  )
  const streamLayer = TranscriptStream.layer.pipe(
    Layer.provide(
      Layer.mergeAll(base, TranscriptInterpreter.mockLayer, pipelineLayer, TranscriptStreamConfig.defaultLayer)
    )
  )

  return Layer.mergeAll(base, TranscriptInterpreter.mockLayer, pipelineLayer, streamLayer)
}

describe("TranscriptStream", () => {
  it.effect("keeps recent windows in the tail before they are committed", () =>
    Effect.gen(function*() {
      const stream = yield* TranscriptStream

      yield* seedScene()

      const first = yield* stream.pushWindow(
        [seg("I attack the goblin", "2026-04-08T12:00:00.000Z")],
        singleTargetContext
      )
      const second = yield* stream.pushWindow(
        [seg("I move 30 feet", "2026-04-08T12:00:04.000Z")],
        singleTargetContext
      )

      expect(first.committed).toHaveLength(0)
      expect(first.tail).toHaveLength(1)
      expect(first.tail[0].observation.selectedIndex).toBe(0)

      expect(second.committed).toHaveLength(0)
      expect(second.tail).toHaveLength(2)
      expect(second.tail.map((item) => item.segments[0].text)).toEqual([
        "I attack the goblin",
        "I move 30 feet"
      ])
    }).pipe(Effect.provide(transcriptStreamTestLayer([5]))))

  it.effect("commits the oldest tail window when a third distinct window arrives", () =>
    Effect.gen(function*() {
      const stream = yield* TranscriptStream
      const log = yield* ObservationLog

      yield* seedScene()

      yield* stream.pushWindow([seg("I attack the goblin", "2026-04-08T12:00:00.000Z")], singleTargetContext)
      yield* stream.pushWindow([seg("I move 30 feet", "2026-04-08T12:00:04.000Z")], singleTargetContext)
      const third = yield* stream.pushWindow([seg("I defend", "2026-04-08T12:00:08.000Z")], singleTargetContext)

      expect(third.committed).toHaveLength(1)
      expect(third.tail).toHaveLength(2)
      expect(third.committed[0].candidates[0].event._tag).toBe("AttackPerformed")
      expect(third.tail.map((item) => item.segments[0].text)).toEqual([
        "I move 30 feet",
        "I defend"
      ])

      const logEntries = yield* log.readAll()
      expect(logEntries).toHaveLength(1)
      expect(logEntries[0].candidates[0].event._tag).toBe("AttackPerformed")
    }).pipe(Effect.provide(transcriptStreamTestLayer([5]))))

  it.effect("flush commits all remaining tail windows", () =>
    Effect.gen(function*() {
      const stream = yield* TranscriptStream

      yield* seedScene()

      yield* stream.pushWindow([seg("I attack the goblin", "2026-04-08T12:00:00.000Z")], singleTargetContext)
      yield* stream.pushWindow([seg("I move 30 feet", "2026-04-08T12:00:04.000Z")], singleTargetContext)
      const flushed = yield* stream.flush()

      expect(flushed.committed).toHaveLength(2)
      expect(flushed.tail).toHaveLength(0)
      expect(flushed.committed[0].candidates[0].event._tag).toBe("AttackPerformed")
      expect(flushed.committed[1].candidates[0].event._tag).toBe("MovementPerformed")
    }).pipe(Effect.provide(transcriptStreamTestLayer([5]))))

  it.effect("omits non-action chatter from the tail", () =>
    Effect.gen(function*() {
      const stream = yield* TranscriptStream

      yield* seedScene()

      const state = yield* stream.pushWindow(
        [seg("hmm let me think", "2026-04-08T12:00:00.000Z")],
        multiTargetContext
      )

      expect(state.committed).toHaveLength(0)
      expect(state.tail).toHaveLength(0)
    }).pipe(Effect.provide(transcriptStreamTestLayer([5]))))
})
