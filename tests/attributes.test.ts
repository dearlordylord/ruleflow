/**
 * Attribute component tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { AttributesComponent } from "../src/domain/components.js"
import { deterministicTestLayer } from "./layers.js"

describe("Attributes Component", () => {
  it.effect("calculates modifiers correctly (OSR formula)", () =>
    Effect.gen(function* () {
      const attrs = AttributesComponent.make({
        strength: 16,
        dexterity: 14,
        intelligence: 8,
        will: 10,
        constitution: 12,
        charisma: 18
      })

      expect(attrs.strengthMod).toBe(3) // (16-10)/2 = 3
      expect(attrs.dexterityMod).toBe(2) // (14-10)/2 = 2
      expect(attrs.intelligenceMod).toBe(-1) // (8-10)/2 = -1
      expect(attrs.willMod).toBe(0) // (10-10)/2 = 0
      expect(attrs.constitutionMod).toBe(1) // (12-10)/2 = 1
      expect(attrs.charismaMod).toBe(4) // (18-10)/2 = 4
    }).pipe(Effect.provide(deterministicTestLayer([10])))
  )

  it.effect("enforces attribute ranges (3-18)", () =>
    Effect.gen(function* () {
      // This should fail schema validation
      const result = yield* Effect.either(
        Effect.try(() =>
          AttributesComponent.make({
            strength: 19, // Too high
            dexterity: 10,
            intelligence: 10,
            will: 10,
            constitution: 10,
            charisma: 10
          })
        )
      )

      expect(result._tag).toBe("Left")
    }).pipe(Effect.provide(deterministicTestLayer([10])))
  )

  it.effect("low attributes give negative modifiers", () =>
    Effect.gen(function* () {
      const attrs = AttributesComponent.make({
        strength: 3,
        dexterity: 3,
        intelligence: 3,
        will: 3,
        constitution: 3,
        charisma: 3
      })

      expect(attrs.strengthMod).toBe(-4) // (3-10)/2 = -3.5 → -4
    }).pipe(Effect.provide(deterministicTestLayer([10])))
  )
})
