/**
 * Transcript Pipeline — cached replay tests
 *
 * These tests exercise the full transcript-to-state-change pipeline using
 * the mock interpreter (no LLM). Each test is a recorded scenario:
 * fixed transcript input → expected candidates → verified state changes.
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"

import { EntityId } from "../src/domain/entities.js"
import { Entity } from "../src/domain/entity.js"
import { ObservationLog } from "../src/domain/infrastructure/ObservationLog.js"
import { ReadModelStore } from "../src/domain/infrastructure/ReadModelStore.js"
import { MovementComponent } from "../src/domain/world/movement.js"
import type { InterpretationContext } from "../src/transcript/index.js"
import { TranscriptInterpreter, TranscriptLlm, TranscriptPipeline, TranscriptSegment } from "../src/transcript/index.js"
import { deterministicTestLayer } from "./layers.js"

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const GUIDO_ID = EntityId.make("00000000-0000-0000-0000-000000000001")
const SWORD_ID = EntityId.make("00000000-0000-0000-0000-000000000010")
const GOBLIN_ID = EntityId.make("00000000-0000-0000-0000-000000000020")
const ORC_ID = EntityId.make("00000000-0000-0000-0000-000000000021")

/** Single-target context: one character, one creature */
const singleTargetContext: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" }
  ],
  activeCharacterId: GUIDO_ID,
  activeWeaponId: SWORD_ID
}

/** Multi-target context: one character, two creatures */
const multiTargetContext: InterpretationContext = {
  entities: [
    { id: GUIDO_ID, name: "Guido", type: "character" },
    { id: GOBLIN_ID, name: "Goblin", type: "creature" },
    { id: ORC_ID, name: "Orc", type: "creature" }
  ],
  activeCharacterId: GUIDO_ID,
  activeWeaponId: SWORD_ID
}

/** Minimal movement component for a human (30 ft base speed) */
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

/** Create entity with movement component so movement systems pass */
function characterEntity(id: EntityId): Entity {
  return Entity.make({ id, components: [humanMovement] })
}

function seg(text: string, speakerHint: string | null = "player"): TranscriptSegment {
  return new TranscriptSegment({
    text: Schema.decodeSync(Schema.NonEmptyString)(text),
    timestamp: new Date("2026-04-08T12:00:00Z"),
    speakerHint
  })
}

/** Compose test layer: deterministic infrastructure + mock interpreter + pipeline */
const transcriptTestLayer = (rolls: Array<number>) => {
  const base = deterministicTestLayer(rolls)

  const pipelineLayer = TranscriptPipeline.layer.pipe(
    Layer.provide(Layer.mergeAll(
      base,
      TranscriptInterpreter.mockLayer
    ))
  )

  return Layer.mergeAll(base, TranscriptInterpreter.mockLayer, pipelineLayer)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Transcript Pipeline", () => {
  describe("mock interpreter (unit)", () => {
    it.effect("produces a single candidate for unambiguous named attack", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I attack the goblin")],
          singleTargetContext
        )

        expect(candidates).toHaveLength(1)
        expect(candidates[0].event._tag).toBe("AttackPerformed")
        expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.85)
        expect(candidates[0].reasoning).toContain("Goblin")
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))

    it.effect("produces multiple candidates for ambiguous attack", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I attack")],
          multiTargetContext
        )

        expect(candidates).toHaveLength(2)
        // Both should be AttackPerformed with different targets
        const tags = candidates.map((c) => c.event._tag)
        expect(tags).toEqual(["AttackPerformed", "AttackPerformed"])
        // Both have lower confidence due to ambiguity
        for (const c of candidates) {
          expect(c.confidence).toBeLessThanOrEqual(0.6)
        }
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))

    it.effect("returns empty array for non-actionable input", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("hmm let me think about this")],
          singleTargetContext
        )

        expect(candidates).toHaveLength(0)
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))

    it.effect("recognizes movement with distance", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I move 30 feet forward")],
          singleTargetContext
        )

        expect(candidates).toHaveLength(1)
        const event = candidates[0].event
        expect(event._tag).toBe("MovementPerformed")
        if (event._tag === "MovementPerformed") {
          expect(event.distanceMoved).toBe(30)
        }
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))

    it.effect("recognizes defensive stance", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I take a defensive stance")],
          singleTargetContext
        )

        expect(candidates).toHaveLength(1)
        expect(candidates[0].event._tag).toBe("DefenseStanceTaken")
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))

    it.effect("resolves single target for generic attack", () =>
      Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        // Only one creature → unambiguous even without naming it
        const candidates = yield* interpreter.interpret(
          [seg("I attack")],
          singleTargetContext
        )

        expect(candidates).toHaveLength(1)
        expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.8)
      }).pipe(Effect.provide(TranscriptInterpreter.mockLayer)))
  })

  describe("live interpreter mapping", () => {
    it("maps a named attack candidate from the LLM into a domain event", async () => {
      const program = Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I attack the goblin")],
          multiTargetContext
        )

        expect(candidates).toHaveLength(1)
        expect(candidates[0].event._tag).toBe("AttackPerformed")
        if (candidates[0].event._tag === "AttackPerformed") {
          expect(candidates[0].event.targetId).toBe(GOBLIN_ID)
          expect(candidates[0].event.attackRoll).toBe(17)
        }
      }).pipe(Effect.provide(
        TranscriptInterpreter.liveLayer.pipe(
          Layer.provide(TranscriptLlm.testLayer(() =>
            Effect.succeed({
              candidates: [{
                type: "attack",
                confidence: 0.92,
                reasoning: "Direct attack declaration against the goblin",
                targetName: "Goblin",
                attackRoll: 17
              }]
            })
          ))
        )
      ))

      await Effect.runPromise(program)
    })

    it("expands an ambiguous attack candidate across all available targets", async () => {
      const program = Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I attack")],
          multiTargetContext
        )

        expect(candidates).toHaveLength(2)
        const targetIds = candidates
          .map((candidate) => candidate.event)
          .filter((event) => event._tag === "AttackPerformed")
          .map((event) => event.targetId)

        expect(targetIds).toEqual([GOBLIN_ID, ORC_ID])
      }).pipe(Effect.provide(
        TranscriptInterpreter.liveLayer.pipe(
          Layer.provide(TranscriptLlm.testLayer(() =>
            Effect.succeed({
              candidates: [{
                type: "attack",
                confidence: 0.55,
                reasoning: "Attack declared without a target"
              }]
            })
          ))
        )
      ))

      await Effect.runPromise(program)
    })

    it("caches identical requests within the live interpreter layer", async () => {
      let calls = 0

      const program = Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const request = interpreter.interpret(
          [seg("I move 20 feet")],
          singleTargetContext
        )

        const first = yield* request
        const second = yield* request

        expect(first).toHaveLength(1)
        expect(second).toHaveLength(1)
      }).pipe(Effect.provide(
        TranscriptInterpreter.liveLayer.pipe(
          Layer.provide(TranscriptLlm.testLayer(() =>
            Effect.sync(() => {
              calls += 1
              return {
                candidates: [{
                  type: "move",
                  confidence: 0.88,
                  reasoning: "Movement amount is explicit",
                  distanceMoved: 20
                }]
              }
            })
          ))
        )
      ))

      await Effect.runPromise(program)
      expect(calls).toBe(1)
    })

    it("supports demo-mode mocked LLM responses through the live interpreter boundary", async () => {
      const program = Effect.gen(function*() {
        const interpreter = yield* TranscriptInterpreter

        const candidates = yield* interpreter.interpret(
          [seg("I attack")],
          multiTargetContext
        )

        expect(candidates).toHaveLength(2)
        const targetIds = candidates
          .map((candidate) => candidate.event)
          .filter((event) => event._tag === "AttackPerformed")
          .map((event) => event.targetId)

        expect(targetIds).toEqual([GOBLIN_ID, ORC_ID])
      }).pipe(Effect.provide(
        TranscriptInterpreter.liveLayer.pipe(
          Layer.provide(TranscriptLlm.demoLayer())
        )
      ))

      await Effect.runPromise(program)
    })
  })

  describe("end-to-end pipeline", () => {
    it.effect("processes movement through projector and records observation", () =>
      Effect.gen(function*() {
        const store = yield* ReadModelStore
        const pipeline = yield* TranscriptPipeline
        const log = yield* ObservationLog

        yield* store.set(characterEntity(GUIDO_ID))

        const result = yield* pipeline.process(
          [seg("I move 30 feet forward")],
          singleTargetContext
        )

        expect(result.candidateCount).toBe(1)
        expect(result.observation).not.toBeNull()

        // Observation was appended to the log with a selected index
        const entries = yield* log.readAll()
        expect(entries).toHaveLength(1)
        expect(entries[0].selectedIndex).toBe(0)
      }).pipe(Effect.provide(transcriptTestLayer([5]))))

    it.effect("non-actionable input produces no observation", () =>
      Effect.gen(function*() {
        const pipeline = yield* TranscriptPipeline
        const log = yield* ObservationLog

        const result = yield* pipeline.process(
          [seg("so anyway what were we talking about")],
          singleTargetContext
        )

        expect(result.candidateCount).toBe(0)
        expect(result.observation).toBeNull()

        // Nothing appended to observation log
        const entries = yield* log.readAll()
        expect(entries).toHaveLength(0)
      }).pipe(Effect.provide(transcriptTestLayer([5]))))

    it.effect("defensive stance processes through projector", () =>
      Effect.gen(function*() {
        const store = yield* ReadModelStore
        const pipeline = yield* TranscriptPipeline
        const log = yield* ObservationLog

        yield* store.set(characterEntity(GUIDO_ID))

        const result = yield* pipeline.process(
          [seg("I take a defensive stance")],
          singleTargetContext
        )

        expect(result.candidateCount).toBe(1)
        expect(result.observation).not.toBeNull()

        const entries = yield* log.readAll()
        expect(entries[0].selectedIndex).toBe(0)
        expect(entries[0].candidates[0].event._tag).toBe("DefenseStanceTaken")
      }).pipe(Effect.provide(transcriptTestLayer([5]))))

    it.effect("sequential transcript segments accumulate observations", () =>
      Effect.gen(function*() {
        const store = yield* ReadModelStore
        const pipeline = yield* TranscriptPipeline
        const log = yield* ObservationLog

        yield* store.set(characterEntity(GUIDO_ID))

        // Process two transcript actions in sequence
        const moveResult = yield* pipeline.process(
          [seg("I move 20 feet")],
          singleTargetContext
        )
        expect(moveResult.candidateCount).toBe(1)

        const defenseResult = yield* pipeline.process(
          [seg("I go defensive")],
          singleTargetContext
        )
        expect(defenseResult.candidateCount).toBe(1)

        // Both observations recorded with selections
        const entries = yield* log.readAll()
        expect(entries).toHaveLength(2)
        for (const entry of entries) {
          expect(entry.selectedIndex).not.toBeNull()
        }

        // Correct event types in order
        expect(entries[0].candidates[0].event._tag).toBe("MovementPerformed")
        expect(entries[1].candidates[0].event._tag).toBe("DefenseStanceTaken")
      }).pipe(Effect.provide(transcriptTestLayer([5]))))
  })
})
