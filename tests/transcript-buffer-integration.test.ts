/**
 * Transcript buffer + pipeline integration tests.
 *
 * These tests exercise the seam between phrase buffering and transcript
 * interpretation: speech arrives as separate segments, the buffer groups
 * them into action windows, and the pipeline interprets each emitted window.
 */
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
  TranscriptBuffer,
  TranscriptBufferConfig,
  TranscriptInterpreter,
  TranscriptPipeline,
  TranscriptSegment
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

function seedAttackScene(): Effect.Effect<void, never, ReadModelStore> {
  return Effect.gen(function*() {
    const store = yield* ReadModelStore

    yield* store.set(characterEntity(GUIDO_ID))
    yield* store.set(combatantEntity(GOBLIN_ID, 12, 2))
    yield* store.set(combatantEntity(ORC_ID, 13, 3))
    yield* store.set(weaponEntity(SWORD_ID))
  })
}

function seg(
  text: string,
  iso: string,
  speakerHint: string | null = "player"
): TranscriptSegment {
  return new TranscriptSegment({
    text: Schema.decodeSync(Schema.NonEmptyString)(text),
    timestamp: new Date(iso),
    speakerHint
  })
}

const transcriptBufferPipelineTestLayer = (rolls: Array<number>) => {
  const base = deterministicTestLayer(rolls)
  const bufferLayer = TranscriptBuffer.layer.pipe(
    Layer.provide(TranscriptBufferConfig.defaultLayer)
  )
  const pipelineLayer = TranscriptPipeline.layer.pipe(
    Layer.provide(Layer.mergeAll(
      base,
      TranscriptInterpreter.mockLayer
    ))
  )

  return Layer.mergeAll(
    base,
    bufferLayer,
    TranscriptInterpreter.mockLayer,
    pipelineLayer
  )
}

describe("TranscriptBuffer + TranscriptPipeline", () => {
  it.effect("turns split attack speech into one interpreted attack action", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer
      const pipeline = yield* TranscriptPipeline
      const log = yield* ObservationLog

      yield* seedAttackScene()

      const first = yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const second = yield* buffer.push(seg("that's a 17 plus 5", "2026-04-08T12:00:00.700Z"))
      const windows = yield* buffer.flush()

      expect(first.emitted).toHaveLength(0)
      expect(second.emitted).toHaveLength(0)
      expect(windows).toHaveLength(1)

      const result = yield* pipeline.process(windows[0].segments, singleTargetContext)
      expect(result.candidateCount).toBe(1)

      const entries = yield* log.readAll()
      expect(entries).toHaveLength(1)
      expect(entries[0].candidates[0].event._tag).toBe("AttackPerformed")
    }).pipe(Effect.provide(transcriptBufferPipelineTestLayer([5]))))

  it.effect("splits long-pause speech into separate projected actions", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer
      const pipeline = yield* TranscriptPipeline
      const log = yield* ObservationLog

      yield* seedAttackScene()

      yield* buffer.push(seg("I attack the goblin", "2026-04-08T12:00:00.000Z"))
      const secondPush = yield* buffer.push(seg("I move 30 feet", "2026-04-08T12:00:03.000Z"))
      const flushed = yield* buffer.flush()

      expect(secondPush.emitted).toHaveLength(1)
      expect(flushed).toHaveLength(1)

      yield* pipeline.process(secondPush.emitted[0].segments, singleTargetContext)
      yield* pipeline.process(flushed[0].segments, singleTargetContext)

      const entries = yield* log.readAll()
      expect(entries).toHaveLength(2)
      expect(entries[0].candidates[0].event._tag).toBe("AttackPerformed")
      expect(entries[1].candidates[0].event._tag).toBe("MovementPerformed")
    }).pipe(
      Effect.provide(
        transcriptBufferPipelineTestLayer([5]).pipe(
          Layer.provideMerge(TranscriptBufferConfig.testLayer(1000))
        )
      )
    ))

  it.effect("keeps ambiguous split attack speech ambiguous after buffering", () =>
    Effect.gen(function*() {
      const buffer = yield* TranscriptBuffer
      const pipeline = yield* TranscriptPipeline
      yield* ReadModelStore

      yield* seedAttackScene()

      yield* buffer.push(seg("I attack", "2026-04-08T12:00:00.000Z"))
      yield* buffer.push(seg("that's a 17", "2026-04-08T12:00:00.500Z"))
      const windows = yield* buffer.flush()

      expect(windows).toHaveLength(1)

      const result = yield* pipeline.process(windows[0].segments, multiTargetContext)
      expect(result.candidateCount).toBe(2)
    }).pipe(Effect.provide(transcriptBufferPipelineTestLayer([5]))))
})
