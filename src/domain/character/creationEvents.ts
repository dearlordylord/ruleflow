/**
 * Character Creation Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import { Alignment } from "./creation.js"
import { CharacterClass } from "./class.js"

export class CharacterCreationStarted extends Schema.TaggedClass<CharacterCreationStarted>()(
  "CharacterCreationStarted",
  {
    entityId: EntityId,
    playerId: EntityId,
    startingLevel: Schema.Int.pipe(Schema.between(1, 10))
  }
) {}

export class AttributesRolled extends Schema.TaggedClass<AttributesRolled>()(
  "AttributesRolled",
  {
    entityId: EntityId,
    strength: Schema.Int.pipe(Schema.between(3, 18)),
    dexterity: Schema.Int.pipe(Schema.between(3, 18)),
    constitution: Schema.Int.pipe(Schema.between(3, 18)),
    intelligence: Schema.Int.pipe(Schema.between(3, 18)),
    will: Schema.Int.pipe(Schema.between(3, 18)),
    charisma: Schema.Int.pipe(Schema.between(3, 18))
  }
) {}

export class ClassChosen extends Schema.TaggedClass<ClassChosen>()(
  "ClassChosen",
  {
    entityId: EntityId,
    class: CharacterClass
  }
) {}

export class SkillsChosen extends Schema.TaggedClass<SkillsChosen>()(
  "SkillsChosen",
  {
    entityId: EntityId,
    primarySkills: Schema.Array(Schema.NonEmptyString).pipe(
      Schema.minItems(2),
      Schema.maxItems(2)
    ),
    secondarySkills: Schema.Array(Schema.NonEmptyString).pipe(
      Schema.minItems(3),
      Schema.maxItems(3)
    )
  }
) {}

export class TraitChosen extends Schema.TaggedClass<TraitChosen>()(
  "TraitChosen",
  {
    entityId: EntityId,
    traitName: Schema.NonEmptyString
  }
) {}

export class HitPointsRolled extends Schema.TaggedClass<HitPointsRolled>()(
  "HitPointsRolled",
  {
    entityId: EntityId,
    rolledValue: Schema.Int.pipe(Schema.greaterThan(0)),
    constitutionModifier: Schema.Int
  }
) {}

export class StartingMoneyRolled extends Schema.TaggedClass<StartingMoneyRolled>()(
  "StartingMoneyRolled",
  {
    entityId: EntityId,
    silverAmount: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class EquipmentPurchased extends Schema.TaggedClass<EquipmentPurchased>()(
  "EquipmentPurchased",
  {
    entityId: EntityId,
    itemId: EntityId,
    costInSilver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class LanguagesChosen extends Schema.TaggedClass<LanguagesChosen>()(
  "LanguagesChosen",
  {
    entityId: EntityId,
    languages: Schema.Array(Schema.NonEmptyString)
  }
) {}

export class AlignmentChosen extends Schema.TaggedClass<AlignmentChosen>()(
  "AlignmentChosen",
  {
    entityId: EntityId,
    alignment: Alignment
  }
) {}

export class NameChosen extends Schema.TaggedClass<NameChosen>()(
  "NameChosen",
  {
    entityId: EntityId,
    name: Schema.NonEmptyString
  }
) {}

export class MysteriesChosen extends Schema.TaggedClass<MysteriesChosen>()(
  "MysteriesChosen",
  {
    entityId: EntityId,
    mysteryNames: Schema.Array(Schema.NonEmptyString)
  }
) {}

export class CharacterCreationCompleted extends Schema.TaggedClass<CharacterCreationCompleted>()(
  "CharacterCreationCompleted",
  {
    entityId: EntityId
  }
) {}
