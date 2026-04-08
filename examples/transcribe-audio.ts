#!/usr/bin/env tsx
/* eslint-disable no-console, functional/immutable-data */
/**
 * Recorded-audio transcript pipeline demo.
 *
 * Run:
 *   pnpm demo:audio -- path/to/file.wav
 *
 * Modes:
 *   WHISPER_TRANSCRIBER_MODE=live|fixture
 *   TRANSCRIPT_INTERPRETER_MODE=mock|demo|live
 */
import process from "node:process"

import { Effect, Layer, ManagedRuntime, Schema } from "effect"

import { CombatStatsComponent } from "../src/domain/combat/stats.js"
import { DiceNotation, WeaponComponent } from "../src/domain/combat/weapons.js"
import { EntityId } from "../src/domain/entities.js"
import { Entity } from "../src/domain/entity.js"
import { GameState } from "../src/domain/infrastructure/GameState.js"
import { ObservationLog } from "../src/domain/infrastructure/ObservationLog.js"
import { Projector } from "../src/domain/infrastructure/Projector.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { CombatResolver } from "../src/domain/services/CombatResolver.js"
import { DiceRoller } from "../src/domain/services/DiceRoller.js"
import { IdGenerator } from "../src/domain/services/IdGenerator.js"
import { WeaponTemplates } from "../src/domain/services/Templates.js"
import { MovementComponent } from "../src/domain/world/movement.js"
import type { InterpretationContext } from "../src/transcript/index.js"
import {
  AudioTranscriptSource,
  TranscriptBuffer,
  TranscriptBufferConfig,
  TranscriptInterpreter,
  TranscriptLlm,
  TranscriptPipeline,
  TranscriptSegment,
  TranscriptStream,
  TranscriptStreamConfig,
  TranscriptStreamState,
  WhisperTranscriber
} from "../src/transcript/index.js"

process.loadEnvFile()

const GUIDO_ID = EntityId.make("00000000-0000-0000-0000-000000000001")
const WEAPON_ID = EntityId.make("00000000-0000-0000-0000-000000000010")
const GOBLIN_ID = EntityId.make("00000000-0000-0000-0000-000000000020")
const ORC_ID = EntityId.make("00000000-0000-0000-0000-000000000021")

const context: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" },
    { id: ORC_ID, name: "Orc", type: "creature" }
  ],
  activeCharacterId: GUIDO_ID,
  activeWeaponId: WEAPON_ID
}

const entityNames = new Map<string, string>(
  context.entities.map((entity) => [entity.id, entity.name])
)
entityNames.set(WEAPON_ID, "Longsword")

function seedEntities(): Effect.Effect<void, never, ReadModelStore> {
  return Effect.gen(function*() {
    const store = yield* ReadModelStore

    yield* store.set(Entity.make({
      id: GUIDO_ID,
      components: [
        CombatStatsComponent.make({
          meleeAttackBonus: 4,
          rangedAttackBonus: 2,
          armorClass: 15,
          initiativeModifier: 0
        }),
        MovementComponent.make({
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
      ]
    }))

    yield* store.set(Entity.make({
      id: WEAPON_ID,
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
    }))

    yield* store.set(Entity.make({
      id: GOBLIN_ID,
      components: [
        CombatStatsComponent.make({
          meleeAttackBonus: 2,
          rangedAttackBonus: 1,
          armorClass: 12,
          initiativeModifier: 0
        })
      ]
    }))

    yield* store.set(Entity.make({
      id: ORC_ID,
      components: [
        CombatStatsComponent.make({
          meleeAttackBonus: 3,
          rangedAttackBonus: 1,
          armorClass: 13,
          initiativeModifier: 0
        })
      ]
    }))
  })
}

function formatEvent(event: Record<string, unknown>): string {
  const lines = [`  ${String(event._tag)}`]
  for (const [key, value] of Object.entries(event)) {
    if (key === "_tag") {
      continue
    }

    if (typeof value === "string" && value.match(/^[0-9a-f-]{36}$/)) {
      lines.push(`    ${key}: ${entityNames.get(value) ?? value}`)
    } else {
      lines.push(`    ${key}: ${JSON.stringify(value)}`)
    }
  }
  return lines.join("\n")
}

const interpreterMode = process.env.TRANSCRIPT_INTERPRETER_MODE ?? "mock"
const whisperMode = process.env.WHISPER_TRANSCRIBER_MODE ?? "live"
const demoLatencyMs = Number(process.env.TRANSCRIPT_DEMO_LATENCY_MS ?? "0")

const baseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  ObservationLog.testLayer,
  IdGenerator.liveLayer,
  DiceRoller.liveLayer,
  WeaponTemplates.testLayer
)

const gameStateLayer = GameState.layer.pipe(Layer.provide(baseLayer))
const projectorLayer = Projector.layer.pipe(Layer.provide(Layer.mergeAll(baseLayer, gameStateLayer)))
const combatLayer = CombatResolver.layer.pipe(Layer.provide(baseLayer))
const bufferLayer = TranscriptBuffer.layer.pipe(Layer.provide(TranscriptBufferConfig.defaultLayer))

const interpreterLayer = interpreterMode === "live"
  ? TranscriptInterpreter.liveLayer.pipe(Layer.provide(TranscriptLlm.liveLayer))
  : interpreterMode === "demo"
  ? TranscriptInterpreter.liveLayer.pipe(Layer.provide(TranscriptLlm.demoLayer({ latencyMs: demoLatencyMs })))
  : TranscriptInterpreter.mockLayer

const fixtureSegments = {
  "fixtures/attack-goblin.wav": [
    new TranscriptSegment({
      text: "I attack the goblin",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    }),
    new TranscriptSegment({
      text: "that's a 17 plus 5",
      timestamp: new Date("2026-04-08T12:00:00.700Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/attack-goblin.wav": [
    new TranscriptSegment({
      text: "I attack the goblin",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/attack-goblin-with-roll.wav": [
    new TranscriptSegment({
      text: "I attack the goblin",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    }),
    new TranscriptSegment({
      text: "that's a 17 plus 5",
      timestamp: new Date("2026-04-08T12:00:00.700Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/attack-then-move.wav": [
    new TranscriptSegment({
      text: "I attack the goblin",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    }),
    new TranscriptSegment({
      text: "I move 30 feet",
      timestamp: new Date("2026-04-08T12:00:03.000Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/attack-then-move-weak.wav": [
    new TranscriptSegment({
      text: "I attack the goblin",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    }),
    new TranscriptSegment({
      text: "I move 30 feet",
      timestamp: new Date("2026-04-08T12:00:03.000Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/ambiguous-attack.wav": [
    new TranscriptSegment({
      text: "I attack",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    })
  ],
  "fixtures/audio/non-action-think.wav": [
    new TranscriptSegment({
      text: "Hmm, let me think",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
      speakerHint: "player"
    })
  ]
}

const whisperLayer = whisperMode === "fixture"
  ? WhisperTranscriber.fixtureLayer(fixtureSegments)
  : WhisperTranscriber.liveLayer

const pipelineLayer = TranscriptPipeline.layer.pipe(
  Layer.provide(Layer.mergeAll(baseLayer, gameStateLayer, projectorLayer, interpreterLayer))
)

const streamLayer = TranscriptStream.layer.pipe(
  Layer.provide(Layer.mergeAll(
    baseLayer,
    gameStateLayer,
    projectorLayer,
    interpreterLayer,
    pipelineLayer,
    TranscriptStreamConfig.defaultLayer
  ))
)

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    baseLayer,
    gameStateLayer,
    projectorLayer,
    combatLayer,
    bufferLayer,
    interpreterLayer,
    whisperLayer,
    pipelineLayer,
    streamLayer
  )
)

function printStreamState(state: TranscriptStreamState, label: string): void {
  console.log(`\n${label}:`)
  console.log(`  committed observations: ${state.committed.length}`)
  for (const [index, entry] of state.committed.entries()) {
    console.log(`\n  committed[${index}] selected=${entry.selectedIndex}`)
    for (const candidate of entry.candidates) {
      console.log(formatEvent(candidate.event as unknown as Record<string, unknown>))
    }
  }

  console.log(`\n  live tail windows: ${state.tail.length}`)
  for (const [index, item] of state.tail.entries()) {
    console.log(`\n  tail[${index}] segments: ${item.segments.map((segment) => segment.text).join(" | ")}`)
    for (const candidate of item.observation.candidates) {
      console.log(formatEvent(candidate.event as unknown as Record<string, unknown>))
    }
  }
}

async function main(): Promise<void> {
  const audioFilePath = process.argv.slice(2).find((arg) => arg !== "--")
  if (!audioFilePath) {
    console.error("Usage: pnpm demo:audio -- path/to/file.wav")
    process.exitCode = 1
    return
  }

  await runtime.runPromise(seedEntities())

  const program = Effect.gen(function*() {
    const transcriber = yield* WhisperTranscriber
    const buffer = yield* TranscriptBuffer
    const stream = yield* TranscriptStream

    const segments = yield* transcriber.transcribe(new AudioTranscriptSource({ audioFilePath }))
    console.log(`\nRaw segments (${segments.length}):`)
    for (const segment of segments) {
      console.log(`  [${segment.timestamp.toISOString()}] ${segment.text}`)
    }

    const windows = []
    for (const segment of segments) {
      const pushed = yield* buffer.push(segment)
      windows.push(...pushed.emitted)
    }
    windows.push(...(yield* buffer.flush()))

    console.log(`\nBuffered windows (${windows.length}):`)
    let currentState = yield* stream.state()
    for (const [index, window] of windows.entries()) {
      console.log(`  Window ${index + 1}: ${window.segments.map((segment) => segment.text).join(" | ")}`)
      currentState = yield* stream.pushWindow(window.segments, context)
    }

    printStreamState(currentState, "Stream state before flush")

    const flushedState = yield* stream.flush()
    printStreamState(flushedState, "Stream state after flush")
  })

  await runtime.runPromise(program)
}

void main()
