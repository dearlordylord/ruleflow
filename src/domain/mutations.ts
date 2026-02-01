/**
 * Phase 1-3 Mutations
 */
import { Schema } from "effect"

import { AttributesComponent, ClassComponent, Component, ComponentTag, HealthComponent } from "./components.js"
import {
  UpdateCharacterCreationMutation,
  SetSkillsMutation,
  SetSavingThrowsMutation
} from "./character/mutations.js"
import {
  TransferItemMutation,
  UseConsumableMutation,
  UpdateInventoryLoadMutation
} from "./inventory/mutations.js"
import {
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
  ConsumeAmmunitionMutation
} from "./combat/mutations.js"
import { EntityId } from "./entities.js"

export class SetAttributesMutation extends Schema.TaggedClass<SetAttributesMutation>()(
  "SetAttributes",
  {
    entityId: EntityId,
    data: Schema.Struct(AttributesComponent.fields).pipe(Schema.partial)
  }
) {}

export class SetHealthMutation extends Schema.TaggedClass<SetHealthMutation>()(
  "SetHealth",
  {
    entityId: EntityId,
    data: Schema.Struct(HealthComponent.fields).pipe(Schema.partial)
  }
) {}

export class DealDamageMutation extends Schema.TaggedClass<DealDamageMutation>()(
  "DealDamage",
  {
    entityId: EntityId,
    amount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    source: EntityId
  }
) {}

export class SetClassMutation extends Schema.TaggedClass<SetClassMutation>()(
  "SetClass",
  {
    entityId: EntityId,
    data: Schema.Struct(ClassComponent.fields).pipe(Schema.partial)
  }
) {}

export class AddItemMutation extends Schema.TaggedClass<AddItemMutation>()(
  "AddItem",
  {
    entityId: EntityId,
    itemId: EntityId
  }
) {}

export class RemoveItemMutation extends Schema.TaggedClass<RemoveItemMutation>()(
  "RemoveItem",
  {
    entityId: EntityId,
    itemId: EntityId
  }
) {}

export class DebitCurrencyMutation extends Schema.TaggedClass<DebitCurrencyMutation>()(
  "DebitCurrency",
  {
    entityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class CreditCurrencyMutation extends Schema.TaggedClass<CreditCurrencyMutation>()(
  "CreditCurrency",
  {
    entityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

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
  // Inventory mutations
  TransferItemMutation,
  UseConsumableMutation,
  UpdateInventoryLoadMutation,
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
  ConsumeAmmunitionMutation
)
export type Mutation = typeof Mutation.Type
