/**
 * Mysticism Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

export class MysteryCast extends Schema.TaggedClass<MysteryCast>()(
  "MysteryCast",
  {
    casterId: EntityId,
    mysteryName: Schema.NonEmptyString,
    targetId: Schema.NullOr(EntityId),
    concentrationSpent: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    wasSuccessful: Schema.Boolean
  }
) {}

export class ConcentrationBroken extends Schema.TaggedClass<ConcentrationBroken>()(
  "ConcentrationBroken",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString,
    reason: Schema.Literal("Damage", "NewSpell", "Voluntary", "Failed Save")
  }
) {}

export class MysteryLearned extends Schema.TaggedClass<MysteryLearned>()(
  "MysteryLearned",
  {
    entityId: EntityId,
    mysteryName: Schema.NonEmptyString,
    tier: Schema.Int.pipe(Schema.between(1, 5))
  }
) {}

export class ArtifactActivated extends Schema.TaggedClass<ArtifactActivated>()(
  "ArtifactActivated",
  {
    userId: EntityId,
    artifactId: EntityId,
    effectTriggered: Schema.NonEmptyString
  }
) {}
