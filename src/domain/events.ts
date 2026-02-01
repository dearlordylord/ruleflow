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
import { ConcentrationBroken } from "./combat/concentrationEvents.js"
import {
  CombatRoundEnded,
  CombatRoundStarted,
  DefenseStanceTaken,
  MovementPerformed,
  MysteryCastDeclared,
  ReadyActionDeclared,
  ReadyActionTriggered,
  RetreatDeclared,
  TurnEnded,
  TurnStarted,
  WithdrawalDeclared
} from "./combat/encounterEvents.js"
import {
  ArmorDamaged,
  ArmorEquipped,
  ArmorUnequipped,
  AttackPerformed,
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
import { DisarmAttempted, PushAttempted } from "./combat/maneuverEvents.js"
import { MoraleChecked } from "./combat/moraleEvents.js"
import { MysteryResolved } from "./combat/mysteryEvents.js"
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

export class CurrencyTransferred extends Schema.TaggedClass<CurrencyTransferred>()(
  "CurrencyTransferred",
  Schema.Struct({
    fromEntityId: EntityId,
    toEntityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }).pipe(
    Schema.filter((event) => event.copper + event.silver + event.gold + event.platinum > 0, {
      message: () => "At least one currency amount must be greater than 0"
    })
  )
) {}

// Re-export events for convenience
export {
  ArmorDamaged,
  ArmorEquipped,
  ArmorUnequipped,
  AttackPerformed,
  CharacterDied,
  CombatEnded,
  CombatRoundEnded,
  CombatRoundStarted,
  CombatStarted,
  ConcentrationBroken,
  DamageDealt,
  DefenseStanceTaken,
  DisarmAttempted,
  EquipmentRepaired,
  GrappleAttempted,
  InitiativeRolled,
  MoraleChecked,
  MovementPerformed,
  MysteryCastDeclared,
  MysteryResolved,
  PushAttempted,
  ReadyActionDeclared,
  ReadyActionTriggered,
  RetreatDeclared,
  ShieldEquipped,
  ShieldUnequipped,
  TurnEnded,
  TurnStarted,
  WeaponDamaged,
  WeaponEquipped,
  WeaponUnequipped,
  WithdrawalDeclared
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
