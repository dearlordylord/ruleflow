/**
 * Domain Mutations - All mutations from all bounded contexts
 */
import { Schema } from "effect"

import {
  DealDamageMutation,
  SetAttributesMutation,
  SetClassMutation,
  SetHealthMutation,
  SetSavingThrowsMutation,
  SetSkillsMutation,
  UpdateCharacterCreationMutation
} from "./character/mutations.js"
import {
  AddConditionMutation,
  ConsumeAmmunitionMutation,
  DamageEquipmentMutation,
  EquipArmorMutation,
  EquipShieldMutation,
  EquipWeaponMutation,
  ReloadWeaponMutation,
  RemoveConditionMutation,
  RepairEquipmentMutation,
  RollInitiativeMutation,
  SetGrappleStateMutation,
  UnequipArmorMutation,
  UnequipShieldMutation,
  UnequipWeaponMutation,
  UpdateCombatStatsMutation,
  UseActionMutation
} from "./combat/mutations.js"
import {
  AdvanceSideMutation,
  AdvanceTurnMutation,
  ClearMysteryCastingMutation,
  ClearReadyActionMutation,
  ResetActionEconomyMutation,
  SetDefenseStanceMutation,
  SetDistanceMutation,
  SetMoraleResultMutation,
  SetMysteryCastingMutation,
  SetReadyActionMutation,
  StartCombatRoundMutation
} from "./combat/encounterMutations.js"
import { EntityId } from "./entities.js"
import { Component, ComponentTag } from "./entity.js"
import {
  AddItemMutation,
  CreateEntityMutation,
  CreditCurrencyMutation,
  DebitCurrencyMutation,
  RemoveItemMutation,
  TransferItemMutation,
  UpdateInventoryLoadMutation,
  UseConsumableMutation
} from "./inventory/mutations.js"

// Re-export all mutations
export {
  SetAttributesMutation,
  SetHealthMutation,
  DealDamageMutation,
  SetClassMutation,
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation,
  AddItemMutation,
  RemoveItemMutation,
  DebitCurrencyMutation,
  CreditCurrencyMutation,
  TransferItemMutation,
  CreateEntityMutation,
  UseConsumableMutation,
  UpdateInventoryLoadMutation,
  AddConditionMutation,
  RemoveConditionMutation,
  SetGrappleStateMutation,
  RollInitiativeMutation,
  UseActionMutation,
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  UnequipArmorMutation,
  EquipShieldMutation,
  UnequipShieldMutation,
  DamageEquipmentMutation,
  RepairEquipmentMutation,
  UpdateCombatStatsMutation,
  ReloadWeaponMutation,
  ConsumeAmmunitionMutation,
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
}

// Cross-domain mutations defined here
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
  // Character mutations
  SetAttributesMutation,
  SetHealthMutation,
  DealDamageMutation,
  SetClassMutation,
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation,
  // Inventory mutations
  AddItemMutation,
  RemoveItemMutation,
  DebitCurrencyMutation,
  CreditCurrencyMutation,
  TransferItemMutation,
  UseConsumableMutation,
  UpdateInventoryLoadMutation,
  // Combat mutations
  AddConditionMutation,
  RemoveConditionMutation,
  SetGrappleStateMutation,
  RollInitiativeMutation,
  UseActionMutation,
  // Combat/Equipment mutations
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  UnequipArmorMutation,
  EquipShieldMutation,
  UnequipShieldMutation,
  DamageEquipmentMutation,
  RepairEquipmentMutation,
  UpdateCombatStatsMutation,
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
  ClearMysteryCastingMutation,
  // Cross-domain mutations
  RemoveComponentMutation,
  SetMultipleComponentsMutation,
  CreateEntityMutation
)
export type Mutation = typeof Mutation.Type
