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
  AttackPerformed,
  DamageDealt,
  GrappleAttempted,
  CombatStarted,
  CombatEnded,
  InitiativeRolled,
  WeaponDamaged,
  ArmorDamaged
} from "./combat/events.js"
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
  MysteryResolved
} from "./combat/mysteryEvents.js"
import {
  ConcentrationBroken
} from "./combat/concentrationEvents.js"
import {
  MoraleChecked
} from "./combat/moraleEvents.js"

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
  // Combat events
  AttackPerformed,
  DamageDealt,
  GrappleAttempted,
  CombatStarted,
  CombatEnded,
  InitiativeRolled,
  WeaponDamaged,
  ArmorDamaged,

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
  CharacterCreationCompleted
)
export type DomainEvent = typeof DomainEvent.Type
