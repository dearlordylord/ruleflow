/**
 * Character Attributes - OSR core attributes
 */
import { Schema } from "effect"

// OSR formula: (attribute - 10) / 2 rounded down
const calculateModifier = (attribute: number): number => Math.floor((attribute - 10) / 2)

export const DEFAULT_ATTRIBUTES = {
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  will: 10,
  constitution: 10,
  charisma: 10
} as const

export class AttributesComponent extends Schema.TaggedClass<AttributesComponent>()("Attributes", {
  strength: Schema.Int.pipe(Schema.between(3, 18)),
  dexterity: Schema.Int.pipe(Schema.between(3, 18)),
  intelligence: Schema.Int.pipe(Schema.between(3, 18)),
  will: Schema.Int.pipe(Schema.between(3, 18)),
  constitution: Schema.Int.pipe(Schema.between(3, 18)),
  charisma: Schema.Int.pipe(Schema.between(3, 18))
}) {}

// Utility functions for attribute modifiers
export function getStrengthMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.strength)
}

export function getDexterityMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.dexterity)
}

export function getIntelligenceMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.intelligence)
}

export function getWillMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.will)
}

export function getConstitutionMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.constitution)
}

export function getCharismaMod(attrs: AttributesComponent): number {
  return calculateModifier(attrs.charisma)
}

// Load capacity based on strength (OSR rule: STR × 10 in pounds)
export function getLoadCapacity(attrs: AttributesComponent): number {
  return attrs.strength * 10
}
