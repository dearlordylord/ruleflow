/**
 * Character Creation - Temporary component during character creation
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import { CharacterClass } from "./class.js"

/**
 * Steps in character creation process
 */
export const CreationStep = Schema.Literal(
  "Started",
  "AttributesRolled",
  "ClassChosen",
  "SkillsChosen",
  "TraitChosen",
  "HitPointsRolled",
  "StartingMoneyRolled",
  "EquipmentPhase",
  "LanguagesChosen",
  "AlignmentChosen",
  "NameChosen",
  "Complete"
)
export type CreationStep = typeof CreationStep.Type

/**
 * Alignment choice
 */
export const Alignment = Schema.Literal("Lawful", "Chaotic", "Neutral")
export type Alignment = typeof Alignment.Type

/**
 * Character creation component - tracks partial state during creation
 */
export class CharacterCreationComponent extends Schema.TaggedClass<CharacterCreationComponent>()(
  "CharacterCreation",
  {
    playerId: EntityId,
    currentStep: CreationStep,
    startingLevel: Schema.Int.pipe(Schema.between(1, 10)),

    // Partial data filled as player makes choices
    attributes: Schema.NullOr(
      Schema.Struct({
        strength: Schema.Int.pipe(Schema.between(3, 18)),
        dexterity: Schema.Int.pipe(Schema.between(3, 18)),
        constitution: Schema.Int.pipe(Schema.between(3, 18)),
        intelligence: Schema.Int.pipe(Schema.between(3, 18)),
        will: Schema.Int.pipe(Schema.between(3, 18)),
        charisma: Schema.Int.pipe(Schema.between(3, 18))
      })
    ),

    class: Schema.NullOr(CharacterClass),

    skills: Schema.NullOr(
      Schema.Struct({
        primary: Schema.Array(Schema.NonEmptyString),
        secondary: Schema.Array(Schema.NonEmptyString)
      })
    ),

    trait: Schema.NullOr(Schema.NonEmptyString),

    hitPoints: Schema.NullOr(
      Schema.Struct({
        rolled: Schema.Int,
        modifier: Schema.Int,
        total: Schema.Int
      })
    ),

    startingMoney: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    remainingMoney: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    purchasedItems: Schema.Array(EntityId),

    languages: Schema.Array(Schema.NonEmptyString),

    alignment: Schema.NullOr(Alignment),

    name: Schema.NullOr(Schema.NonEmptyString),

    // For Mystic: chosen mysteries
    mysteries: Schema.NullOr(Schema.Array(Schema.NonEmptyString))
  }
) {}
