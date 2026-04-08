#!/usr/bin/env tsx
/* eslint-disable no-console, functional/immutable-data */
/**
 * Interactive transcript pipeline demo.
 *
 * DEMO SCAFFOLDING — not foundational code. This file exists to make the
 * transcript pipeline tangible: type natural language, see candidate events
 * and state changes. It hardcodes a scenario (Guido vs two goblins) and
 * supports three modes:
 * - mock: pure pattern-matching interpreter
 * - demo: mocked LLM service with optional fake latency
 * - live: real OpenRouter-backed LLM service
 *
 * Foundational code lives in src/transcript/ — the Effect services,
 * types, and pipeline orchestration that the LLM layer will plug into.
 *
 * Run: pnpm demo:transcript
 */
import * as readline from "node:readline"
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
  TranscriptInterpreter,
  TranscriptLlm,
  TranscriptPipeline,
  TranscriptSegment,
  TranscriptStream,
  TranscriptStreamConfig
} from "../src/transcript/index.js"

process.loadEnvFile()

// ---------------------------------------------------------------------------
// Demo scenario (hardcoded — this is scaffolding, not foundational)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Layer composition (demo wiring — foundational services are in src/)
// ---------------------------------------------------------------------------

const demoBaseLayer = Layer.mergeAll(
  ReadModelStore.testLayer,
  ObservationLog.testLayer,
  IdGenerator.liveLayer,
  DiceRoller.liveLayer,
  WeaponTemplates.testLayer
)

const demoGameStateLayer = GameState.layer.pipe(Layer.provide(demoBaseLayer))

const demoProjectorLayer = Projector.layer.pipe(
  Layer.provide(Layer.mergeAll(demoBaseLayer, demoGameStateLayer))
)

const demoCombatLayer = CombatResolver.layer.pipe(Layer.provide(demoBaseLayer))

const interpreterMode = process.env.TRANSCRIPT_INTERPRETER_MODE ?? "mock"
const demoLatencyMs = Number(process.env.TRANSCRIPT_DEMO_LATENCY_MS ?? "0")

const interpreterLayer = interpreterMode === "live"
  ? TranscriptInterpreter.liveLayer.pipe(Layer.provide(TranscriptLlm.liveLayer))
  : interpreterMode === "demo"
  ? TranscriptInterpreter.liveLayer.pipe(Layer.provide(TranscriptLlm.demoLayer({ latencyMs: demoLatencyMs })))
  : TranscriptInterpreter.mockLayer

const demoPipelineLayer = TranscriptPipeline.layer.pipe(
  Layer.provide(Layer.mergeAll(
    demoBaseLayer,
    demoGameStateLayer,
    demoProjectorLayer,
    interpreterLayer
  ))
)

const demoStreamLayer = TranscriptStream.layer.pipe(
  Layer.provide(Layer.mergeAll(
    demoBaseLayer,
    demoGameStateLayer,
    demoProjectorLayer,
    interpreterLayer,
    demoPipelineLayer,
    TranscriptStreamConfig.defaultLayer
  ))
)

const demoLayer = Layer.mergeAll(
  demoBaseLayer,
  demoGameStateLayer,
  demoProjectorLayer,
  demoCombatLayer,
  interpreterLayer,
  demoPipelineLayer,
  demoStreamLayer
)

// Single runtime — all effects share the same service instances
const runtime = ManagedRuntime.make(demoLayer)

// ---------------------------------------------------------------------------
// Entity name lookup (demo display helper)
// ---------------------------------------------------------------------------

const entityNames = new Map<string, string>(
  context.entities.map((e) => [e.id, e.name])
)
entityNames.set(WEAPON_ID, "Longsword")

function nameOf(id: string): string {
  return entityNames.get(id) ?? id.slice(-4)
}

// ---------------------------------------------------------------------------
// REPL
// ---------------------------------------------------------------------------

function formatEvent(event: Record<string, unknown>): string {
  const tag = event._tag as string
  const parts = [`  ${tag}`]

  for (const [key, value] of Object.entries(event)) {
    if (key === "_tag") continue
    if (typeof value === "string" && value.match(/^[0-9a-f-]{36}$/)) {
      parts.push(`    ${key}: ${nameOf(value)}`)
    } else {
      parts.push(`    ${key}: ${JSON.stringify(value)}`)
    }
  }
  return parts.join("\n")
}

async function processLine(
  trimmed: string
): Promise<void> {
  const segment = new TranscriptSegment({
    text: Schema.decodeSync(Schema.NonEmptyString)(trimmed),
    timestamp: new Date(),
    speakerHint: "player"
  })

  const program = Effect.gen(function*() {
    const stream = yield* TranscriptStream
    const state = yield* stream.pushWindow([segment], context)

    if (state.committed.length === 0 && state.tail.length === 0) {
      console.log("\n  (no actionable input detected)")
    } else {
      console.log(`\n  committed observations: ${state.committed.length}`)
      for (const [index, entry] of state.committed.entries()) {
        console.log(`\n  committed[${index}] selected=${entry.selectedIndex}`)
        for (let i = 0; i < entry.candidates.length; i++) {
          const candidate = entry.candidates[i]
          const selected = entry.selectedIndex === i ? " << SELECTED" : ""
          console.log(`\n  [${i}] confidence: ${candidate.confidence}${selected}`)
          console.log(formatEvent(candidate.event as unknown as Record<string, unknown>))
        }
      }

      console.log(`\n  live tail windows: ${state.tail.length}`)
      for (const [index, item] of state.tail.entries()) {
        console.log(`\n  tail[${index}] segments: ${item.segments.map((s) => s.text).join(" | ")}`)
        for (let i = 0; i < item.observation.candidates.length; i++) {
          const candidate = item.observation.candidates[i]
          const selected = item.observation.selectedIndex === i ? " << SELECTED" : ""
          console.log(`\n  [${i}] confidence: ${candidate.confidence}${selected}`)
          console.log(formatEvent(candidate.event as unknown as Record<string, unknown>))
        }
      }
    }
  })

  await runtime.runPromise(program)
}

async function main(): Promise<void> {
  // Seed the shared runtime with entities
  await runtime.runPromise(seedEntities())

  console.log("=".repeat(60))
  const mode = interpreterMode === "live"
    ? "live OpenRouter interpreter"
    : interpreterMode === "demo"
    ? "demo mocked LLM interpreter"
    : "mock interpreter"
  console.log(`Transcript Pipeline Demo (${mode})`)
  console.log("=".repeat(60))
  console.log("")
  console.log("Scenario: Guido the Fighter vs a Goblin and an Orc")
  console.log("Guido has a Longsword equipped.")
  console.log("")
  console.log("Try:")
  console.log("  \"I attack the goblin\"       (unambiguous, single candidate)")
  console.log("  \"I attack\"                  (ambiguous, multiple candidates)")
  console.log("  \"I move 30 feet\"            (movement)")
  console.log("  \"I take a defensive stance\" (defense)")
  console.log("  \"I withdraw\"                (withdrawal)")
  console.log("  \"hmm let me think\"          (non-actionable, no candidates)")
  console.log("  \"/flush\"                    (commit the remaining live tail)")
  console.log("")
  console.log("Type a line of speech. Ctrl-C to exit.")
  console.log("This demo now shows committed history separately from the live tail.")
  if (interpreterMode === "live") {
    console.log("Using OPENROUTER_API_KEY from .env or the process environment.")
  }
  if (interpreterMode === "demo" && demoLatencyMs > 0) {
    console.log(`Using mocked LLM responses with ${demoLatencyMs}ms fake latency.`)
  }
  console.log("-".repeat(60))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\n> "
  })

  rl.prompt()

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) {
      rl.prompt()
      continue
    }

    try {
      if (trimmed === "/flush") {
        const flushProgram = Effect.gen(function*() {
          const stream = yield* TranscriptStream
          return yield* stream.flush()
        })
        const flushed = await runtime.runPromise(flushProgram)
        console.log(`\n  flushed tail -> committed observations: ${flushed.committed.length}, live tail: ${flushed.tail.length}`)
      } else {
        await processLine(trimmed)
      }
    } catch (err) {
      console.error("\n  Error:", err)
    }

    rl.prompt()
  }

  console.log("\nBye!")
  await runtime.dispose()
}

main().catch(console.error)
