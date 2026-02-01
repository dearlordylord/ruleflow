/**
 * Character Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

export class CharacterLeveledUp extends Schema.TaggedClass<CharacterLeveledUp>()(
  "CharacterLeveledUp",
  {
    entityId: EntityId,
    oldLevel: Schema.Int.pipe(Schema.between(1, 9)),
    newLevel: Schema.Int.pipe(Schema.between(2, 10))
  }
) {}

export class CharacterDied extends Schema.TaggedClass<CharacterDied>()(
  "CharacterDied",
  {
    entityId: EntityId,
    killedBy: Schema.NullOr(EntityId),
    finalHP: Schema.Int
  }
) {}

export class TraitAcquired extends Schema.TaggedClass<TraitAcquired>()(
  "TraitAcquired",
  {
    entityId: EntityId,
    traitName: Schema.NonEmptyString,
    atLevel: Schema.Int.pipe(Schema.between(1, 10))
  }
) {}

export class SkillImproved extends Schema.TaggedClass<SkillImproved>()(
  "SkillImproved",
  {
    entityId: EntityId,
    skillName: Schema.NonEmptyString,
    newBonus: Schema.Int
  }
) {}

export class WeaponSpecializationSelected extends Schema.TaggedClass<WeaponSpecializationSelected>()(
  "WeaponSpecializationSelected",
  {
    entityId: EntityId,
    weaponGroup: Schema.NonEmptyString
  }
) {}

export class LuckPointBurned extends Schema.TaggedClass<LuckPointBurned>()(
  "LuckPointBurned",
  {
    entityId: EntityId,
    points: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class LuckPointRecovered extends Schema.TaggedClass<LuckPointRecovered>()(
  "LuckPointRecovered",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}
