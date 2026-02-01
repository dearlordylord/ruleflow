/**
 * Domain Events - source of truth for event sourcing
 */
import { Schema } from "effect"

import {
  AlignmentChosen,
  AttributesRolled,
  CharacterCreationCompleted,
  CharacterCreationStarted,
  ClassChosen,
  EquipmentPurchased,
  HitPointsRolled,
  LanguagesChosen,
  MysteriesChosen,
  NameChosen,
  SkillsChosen,
  StartingMoneyRolled,
  TraitChosen
} from "./character/creationEvents.js"
import { CharacterDied } from "./character/events.js"
import { EntityId } from "./entities.js"
import {
  ContainerDiscovered,
  ContainerLockDiscovered,
  ContainerSearched,
  ItemDiscovered,
  ItemDropped,
  ItemLooted,
  LootDistributed
} from "./inventory/loot-events.js"

export class AttackPerformed extends Schema.TaggedClass<AttackPerformed>()(
  "AttackPerformed",
  {
    attackerId: EntityId,
    targetId: EntityId,
    weaponId: EntityId,
    attackRoll: Schema.Int.pipe(Schema.between(1, 20)),
    isCritical: Schema.Boolean
  }
) {}

export class CurrencyTransferred extends Schema.TaggedClass<CurrencyTransferred>()(
  "CurrencyTransferred",
  {
    fromEntityId: EntityId,
    toEntityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export const DomainEvent = Schema.Union(
  AttackPerformed,
  CurrencyTransferred,
  CharacterCreationStarted,
  AttributesRolled,
  ClassChosen,
  SkillsChosen,
  TraitChosen,
  HitPointsRolled,
  StartingMoneyRolled,
  EquipmentPurchased,
  LanguagesChosen,
  AlignmentChosen,
  NameChosen,
  MysteriesChosen,
  CharacterCreationCompleted,
  CharacterDied,
  ItemDiscovered,
  ContainerDiscovered,
  ItemLooted,
  ItemDropped,
  ContainerSearched,
  ContainerLockDiscovered,
  LootDistributed
)
export type DomainEvent = typeof DomainEvent.Type
