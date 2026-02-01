/**
 * Domain Mutations - All mutations from all bounded contexts
 */
import { Schema } from "effect"

import { Component, ComponentTag } from "./components.js"
import { EntityId } from "./entities.js"

// Re-export all mutations from bounded contexts
export {
  SetAttributesMutation,
  SetHealthMutation,
  DealDamageMutation,
  SetClassMutation,
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation
} from "./character/mutations.js"

export {
  AddItemMutation,
  RemoveItemMutation,
  DebitCurrencyMutation,
  CreditCurrencyMutation
} from "./inventory/mutations.js"

export {
  AddConditionMutation,
  RemoveConditionMutation,
  SetGrappleStateMutation,
  RollInitiativeMutation,
  UseActionMutation,
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  EquipShieldMutation,
  DamageEquipmentMutation,
  ReloadWeaponMutation,
  ConsumeAmmunitionMutation
} from "./combat/mutations.js"

export {
  StartCombatRoundMutation,
  AdvanceSideMutation,
  AdvanceTurnMutation,
  ResetActionEconomyMutation,
  SetDistanceMutation,
  SetReadyActionMutation,
  ClearReadyActionMutation,
  SetDefenseStanceMutation,
  SetMoraleResultMutation,
  SetMysteryCastingMutation,
  ClearMysteryCastingMutation
} from "./combat/encounterMutations.js"

// Import for union only
import {
  SetAttributesMutation,
  SetHealthMutation,
  DealDamageMutation,
  SetClassMutation,
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation
} from "./character/mutations.js"
import {
  AddItemMutation,
  RemoveItemMutation,
  DebitCurrencyMutation,
  CreditCurrencyMutation
} from "./inventory/mutations.js"
import {
  AddConditionMutation,
  RemoveConditionMutation,
  SetGrappleStateMutation,
  RollInitiativeMutation,
  UseActionMutation,
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  EquipShieldMutation,
  DamageEquipmentMutation,
  ReloadWeaponMutation,
  ConsumeAmmunitionMutation
} from "./combat/mutations.js"
import {
  StartCombatRoundMutation,
  AdvanceSideMutation,
  AdvanceTurnMutation,
  ResetActionEconomyMutation,
  SetDistanceMutation,
  SetReadyActionMutation,
  ClearReadyActionMutation,
  SetDefenseStanceMutation,
  SetMoraleResultMutation,
  SetMysteryCastingMutation,
  ClearMysteryCastingMutation
} from "./combat/encounterMutations.js"

// Mutations defined here (cross-domain)
export class RemoveComponentMutation extends Schema.TaggedClass<RemoveComponentMutation>()(
  "RemoveComponent",
  {
    entityId: EntityId,
    componentTag: ComponentTag
  }
) {}

export class SetMultipleComponentsMutation extends Schema.TaggedClass<SetMultipleComponentsMutation>()(
  "SetMultipleComponents",
  {
    entityId: EntityId,
    components: Schema.Array(Component),
    removeComponents: Schema.Array(ComponentTag)
  }
) {}

// Mutation union
export const Mutation = Schema.Union(
  SetAttributesMutation,
  SetHealthMutation,
  DealDamageMutation,
  SetClassMutation,
  AddItemMutation,
  RemoveItemMutation,
  DebitCurrencyMutation,
  CreditCurrencyMutation,
  RemoveComponentMutation,
  SetMultipleComponentsMutation,
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation,
  // Combat mutations
  AddConditionMutation,
  RemoveConditionMutation,
  SetGrappleStateMutation,
  RollInitiativeMutation,
  UseActionMutation,
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  EquipShieldMutation,
  DamageEquipmentMutation,
  ReloadWeaponMutation,
  ConsumeAmmunitionMutation,
  // Combat encounter mutations
  StartCombatRoundMutation,
  AdvanceSideMutation,
  AdvanceTurnMutation,
  ResetActionEconomyMutation,
  SetDistanceMutation,
  SetReadyActionMutation,
  ClearReadyActionMutation,
  SetDefenseStanceMutation,
  SetMoraleResultMutation,
  SetMysteryCastingMutation,
  ClearMysteryCastingMutation
)
export type Mutation = typeof Mutation.Type
