/**
 * Domain Events - source of truth for event sourcing
 */
import { Schema } from "effect"

import { EntityId } from "./entities.js"
import {
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
  CharacterCreationCompleted
} from "./character/creationEvents.js"
import {
  ItemPurchased,
  ItemSold,
  ConsumableUsed,
  ItemDiscarded
} from "./inventory/events.js"
import {
  WeaponEquipped,
  WeaponUnequipped,
  ArmorEquipped,
  ArmorUnequipped,
  ShieldEquipped,
  ShieldUnequipped,
  EquipmentRepaired,
  WeaponDamaged,
  ArmorDamaged
} from "./combat/events.js"

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
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
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
  // Inventory events
  ItemPurchased,
  ItemSold,
  ConsumableUsed,
  ItemDiscarded,
  // Combat/Equipment events
  WeaponEquipped,
  WeaponUnequipped,
  ArmorEquipped,
  ArmorUnequipped,
  ShieldEquipped,
  ShieldUnequipped,
  EquipmentRepaired,
  WeaponDamaged,
  ArmorDamaged
)
export type DomainEvent = typeof DomainEvent.Type
