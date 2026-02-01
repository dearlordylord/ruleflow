/**
 * Character Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import { AttributesComponent } from "./attributes.js"
import { ClassComponent } from "./class.js"
import { HealthComponent } from "./health.js"
import { CharacterCreationComponent } from "./creation.js"
import { SkillsComponent } from "./skills.js"
import { SavingThrowsComponent } from "./saves.js"

export class SetAttributesMutation extends Schema.TaggedClass<SetAttributesMutation>()(
  "SetAttributes",
  {
    entityId: EntityId,
    data: Schema.Struct(AttributesComponent.fields).pipe(Schema.partial)
  }
) {}

export class SetHealthMutation extends Schema.TaggedClass<SetHealthMutation>()(
  "SetHealth",
  {
    entityId: EntityId,
    data: Schema.Struct(HealthComponent.fields).pipe(Schema.partial)
  }
) {}

export class DealDamageMutation extends Schema.TaggedClass<DealDamageMutation>()(
  "DealDamage",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    source: EntityId
  }
) {}

export class HealDamageMutation extends Schema.TaggedClass<HealDamageMutation>()(
  "HealDamage",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class SetClassMutation extends Schema.TaggedClass<SetClassMutation>()(
  "SetClass",
  {
    entityId: EntityId,
    data: Schema.Struct(ClassComponent.fields).pipe(Schema.partial)
  }
) {}

export class GainExperienceMutation extends Schema.TaggedClass<GainExperienceMutation>()(
  "GainExperience",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class AddTraitMutation extends Schema.TaggedClass<AddTraitMutation>()(
  "AddTrait",
  {
    entityId: EntityId,
    traitName: Schema.NonEmptyString
  }
) {}

export class RemoveTraitMutation extends Schema.TaggedClass<RemoveTraitMutation>()(
  "RemoveTrait",
  {
    entityId: EntityId,
    traitName: Schema.NonEmptyString
  }
) {}

export class SetSkillProficiencyMutation extends Schema.TaggedClass<SetSkillProficiencyMutation>()(
  "SetSkillProficiency",
  {
    entityId: EntityId,
    skillName: Schema.NonEmptyString,
    proficiency: Schema.Literal("Untrained", "Primary", "Secondary")
  }
) {}

export class SpendLuckPointMutation extends Schema.TaggedClass<SpendLuckPointMutation>()(
  "SpendLuckPoint",
  {
    entityId: EntityId,
    points: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class RecoverLuckPointsMutation extends Schema.TaggedClass<RecoverLuckPointsMutation>()(
  "RecoverLuckPoints",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

// Character creation mutations
export class UpdateCharacterCreationMutation extends Schema.TaggedClass<UpdateCharacterCreationMutation>()(
  "UpdateCharacterCreation",
  {
    entityId: EntityId,
    data: Schema.Struct(CharacterCreationComponent.fields).pipe(Schema.partial)
  }
) {}

export class SetSkillsMutation extends Schema.TaggedClass<SetSkillsMutation>()(
  "SetSkills",
  {
    entityId: EntityId,
    data: Schema.Struct(SkillsComponent.fields).pipe(Schema.partial)
  }
) {}

export class SetSavingThrowsMutation extends Schema.TaggedClass<SetSavingThrowsMutation>()(
  "SetSavingThrows",
  {
    entityId: EntityId,
    data: Schema.Struct(SavingThrowsComponent.fields).pipe(Schema.partial)
  }
) {}
