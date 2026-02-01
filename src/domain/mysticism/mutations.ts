/**
 * Mysticism Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

export class SpendConcentrationMutation extends Schema.TaggedClass<SpendConcentrationMutation>()(
  "SpendConcentration",
  {
    entityId: EntityId,
    points: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class RecoverConcentrationMutation extends Schema.TaggedClass<RecoverConcentrationMutation>()(
  "RecoverConcentration",
  {
    entityId: EntityId,
    points: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class LearnMysteryMutation extends Schema.TaggedClass<LearnMysteryMutation>()(
  "LearnMystery",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString
  }
) {}

export class ForgetMysteryMutation extends Schema.TaggedClass<ForgetMysteryMutation>()(
  "ForgetMystery",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString
  }
) {}

export class StartConcentrationMutation extends Schema.TaggedClass<StartConcentrationMutation>()(
  "StartConcentration",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString
  }
) {}

export class BreakConcentrationMutation extends Schema.TaggedClass<BreakConcentrationMutation>()(
  "BreakConcentration",
  {
    entityId: EntityId
  }
) {}

export class AttuneArtifactMutation extends Schema.TaggedClass<AttuneArtifactMutation>()(
  "AttuneArtifact",
  {
    entityId: EntityId,
    artifactId: EntityId
  }
) {}

export class UseArtifactChargeMutation extends Schema.TaggedClass<UseArtifactChargeMutation>()(
  "UseArtifactCharge",
  {
    artifactId: EntityId,
    chargesUsed: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}
