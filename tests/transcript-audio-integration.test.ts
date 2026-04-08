/**
 * Audio fixture -> transcriber -> buffer -> pipeline integration tests.
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
  AudioTranscriptSource,
  TranscriptBuffer,
  TranscriptBufferConfig,
  TranscriptInterpreter,
  TranscriptPipeline,
  TranscriptSegment,
  WhisperTranscriber
} from "../src/transcript/index.js"
import { deterministicTestLayer } from "./layers.js"

const GUIDO_ID = EntityId.make("00000000-0000-0000-0000-000000000001")
const SWORD_ID = EntityId.make("00000000-0000-0000-0000-000000000010")
const GOBLIN_ID = EntityId.make("00000000-0000-0000-0000-000000000020")

const singleTargetContext: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" }
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

const audioTranscriptTestLayer = (rolls: Array<number>) => {
  const base = deterministicTestLayer(rolls)
  const bufferLayer = TranscriptBuffer.layer.pipe(
    Layer.provide(TranscriptBufferConfig.defaultLayer)
  )
  const pipelineLayer = TranscriptPipeline.layer.pipe(
    Layer.provide(Layer.mergeAll(base, TranscriptInterpreter.mockLayer))
  )

  return Layer.mergeAll(base, bufferLayer, TranscriptInterpreter.mockLayer, pipelineLayer)
}

describe("WhisperTranscriber + TranscriptBuffer + TranscriptPipeline", () => {
  it.effect("projects a prerecorded split attack fixture through the full transcript seam", () =>
    Effect.gen(function*() {
      const transcriber = yield* WhisperTranscriber
      const buffer = yield* TranscriptBuffer
      const pipeline = yield* TranscriptPipeline
      const log = yield* ObservationLog

      yield* seedAttackScene()

      const segments = yield* transcriber.transcribe(
        new AudioTranscriptSource({
          audioFilePath: "fixtures/attack-goblin.wav"
        })
      )

      let emittedWindows = 0
      for (const segment of segments) {
        const pushResult = yield* buffer.push(segment)
        for (const window of pushResult.emitted) {
          emittedWindows += 1
          yield* pipeline.process(window.segments, singleTargetContext)
        }
      }

      const flushed = yield* buffer.flush()
      for (const window of flushed) {
        emittedWindows += 1
        yield* pipeline.process(window.segments, singleTargetContext)
      }

      expect(emittedWindows).toBe(1)

      const entries = yield* log.readAll()
      expect(entries).toHaveLength(1)
      expect(entries[0].candidates[0].event._tag).toBe("AttackPerformed")
    }).pipe(Effect.provide(
      Layer.mergeAll(
        audioTranscriptTestLayer([5]),
        WhisperTranscriber.fixtureLayer({
          "fixtures/attack-goblin.wav": [
            seg("I attack the goblin", "2026-04-08T12:00:00.000Z"),
            seg("that's a 17 plus 5", "2026-04-08T12:00:00.700Z")
          ]
        })
      )
    )))
})
