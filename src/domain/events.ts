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
import {
  ArmorDamaged,
  ArmorEquipped,
  ArmorUnequipped,
  CombatEnded,
  CombatStarted,
  DamageDealt,
  EquipmentRepaired,
  GrappleAttempted,
  InitiativeRolled,
  ShieldEquipped,
  ShieldUnequipped,
  WeaponDamaged,
  WeaponEquipped,
  WeaponUnequipped
} from "./combat/events.js"
import {
  ConcentrationBroken
} from "./combat/concentrationEvents.js"
import {
  CombatRoundStarted,
  CombatRoundEnded,
  TurnStarted,
  TurnEnded,
  MysteryCastDeclared,
  WithdrawalDeclared,
  RetreatDeclared,
  MovementPerformed,
  DefenseStanceTaken,
  ReadyActionDeclared,
  ReadyActionTriggered
} from "./combat/encounterEvents.js"
import {
  DisarmAttempted,
  PushAttempted
} from "./combat/maneuverEvents.js"
import {
  MoraleChecked
} from "./combat/moraleEvents.js"
import {
  MysteryResolved
} from "./combat/mysteryEvents.js"
import { EntityId } from "./entities.js"
import { ConsumableUsed, ItemDiscarded, ItemPurchased, ItemSold } from "./inventory/events.js"
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

// Re-export events for convenience
export {
  DamageDealt,
  GrappleAttempted,
  CombatStarted,
  CombatEnded,
  InitiativeRolled,
  WeaponDamaged,
  ArmorDamaged,
  WeaponEquipped,
  WeaponUnequipped,
  ArmorEquipped,
  ArmorUnequipped,
  ShieldEquipped,
  ShieldUnequipped,
  EquipmentRepaired,
  CombatRoundStarted,
  CombatRoundEnded,
  TurnStarted,
  TurnEnded,
  MysteryCastDeclared,
  WithdrawalDeclared,
  RetreatDeclared,
  MovementPerformed,
  DefenseStanceTaken,
  ReadyActionDeclared,
  ReadyActionTriggered,
  DisarmAttempted,
  PushAttempted,
  MysteryResolved,
  ConcentrationBroken,
  MoraleChecked,
  CharacterDied
}

export const DomainEvent = Schema.Union(
  // Character creation events
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

  // Combat events
  AttackPerformed,
  DamageDealt,
  GrappleAttempted,
  CombatStarted,
  CombatEnded,
  InitiativeRolled,

  // Combat encounter events
  CombatRoundStarted,
  CombatRoundEnded,
  TurnStarted,
  TurnEnded,
  MysteryCastDeclared,
  WithdrawalDeclared,
  RetreatDeclared,
  MovementPerformed,
  DefenseStanceTaken,
  ReadyActionDeclared,
  ReadyActionTriggered,

  // Maneuver events
  DisarmAttempted,
  PushAttempted,

  // Mystery events
  MysteryResolved,

  // Concentration events
  ConcentrationBroken,

  // Morale events
  MoraleChecked,

  // Currency events
  CurrencyTransferred,

  // Inventory events
  ItemPurchased,
  ItemSold,
  ConsumableUsed,
  ItemDiscarded,

  // Looting events
  ItemDiscovered,
  ContainerDiscovered,
  ItemLooted,
  ItemDropped,
  ContainerSearched,
  ContainerLockDiscovered,
  LootDistributed,

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
