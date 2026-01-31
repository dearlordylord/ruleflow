/**
 * Character Attributes - OSR core attributes
 */
import { Schema } from "effect"

// OSR formula: (attribute - 10) / 2 rounded down
const calculateModifier = (attribute: number): number => Math.floor((attribute - 10) / 2)

export class AttributesComponent extends Schema.TaggedClass<AttributesComponent>()("Attributes", {
  strength: Schema.Int.pipe(Schema.between(3, 18)),
  dexterity: Schema.Int.pipe(Schema.between(3, 18)),
  intelligence: Schema.Int.pipe(Schema.between(3, 18)),
  will: Schema.Int.pipe(Schema.between(3, 18)),
  constitution: Schema.Int.pipe(Schema.between(3, 18)),
  charisma: Schema.Int.pipe(Schema.between(3, 18))
}) {
  get strengthMod() {
    return calculateModifier(this.strength)
  }
  get dexterityMod() {
    return calculateModifier(this.dexterity)
  }
  get intelligenceMod() {
    return calculateModifier(this.intelligence)
  }
  get willMod() {
    return calculateModifier(this.will)
  }
  get constitutionMod() {
    return calculateModifier(this.constitution)
  }
  get charismaMod() {
    return calculateModifier(this.charisma)
  }

  // Load capacity based on strength (OSR rule: STR × 10 in pounds)
  get loadCapacity(): number {
    return this.strength * 10
  }
}
