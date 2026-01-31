/**
 * DiceNotation validation tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { DiceNotation } from "../src/domain/components.js"

describe("DiceNotation Schema", () => {
  it("validates correct dice notation formats", () => {
    const validFormats = ["1d8", "2d6", "1d20+3", "3d4-2", "10d10+10", "1d6-1"]

    validFormats.forEach(dice => {
      expect(() => Schema.decodeSync(DiceNotation)(dice)).not.toThrow()
    })
  })

  it("rejects invalid dice notation formats", () => {
    const invalidFormats = [
      "d8", // missing count
      "1d", // missing sides
      "1dd8", // double 'd'
      "1d8+", // modifier without value
      "abc", // non-numeric
      "1d8+3+2", // multiple modifiers
      "", // empty string
      "1d8 +3" // space in modifier
    ]

    invalidFormats.forEach(dice => {
      expect(() => Schema.decodeSync(DiceNotation)(dice)).toThrow()
    })
  })

  it("preserves the branded type for type safety", () => {
    const validDice = Schema.decodeSync(DiceNotation)("1d8")

    // This should be a branded string
    expect(typeof validDice).toBe("string")
    expect(validDice).toBe("1d8")
  })
})
