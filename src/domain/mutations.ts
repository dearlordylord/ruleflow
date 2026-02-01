/**
 * Phase 1-3 Mutations
 */
import { Schema } from "effect"

import { AttributesComponent, ClassComponent, HealthComponent } from "./character/index.js"
import { SetSavingThrowsMutation, SetSkillsMutation, UpdateCharacterCreationMutation } from "./character/mutations.js"
import {
  ConsumeAmmunitionMutation,
  DamageEquipmentMutation,
  EquipArmorMutation,
  EquipShieldMutation,
  EquipWeaponMutation,
  ReloadWeaponMutation,
  RepairEquipmentMutation,
  UnequipArmorMutation,
  UnequipShieldMutation,
  UnequipWeaponMutation,
  UpdateCombatStatsMutation
} from "./combat/mutations.js"
import { EntityId } from "./entities.js"
import { Component, ComponentTag, Entity } from "./entity.js"
import { UpdateInventoryLoadMutation, UseConsumableMutation } from "./inventory/mutations.js"

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
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class CreditCurrencyMutation extends Schema.TaggedClass<CreditCurrencyMutation>()(
  "CreditCurrency",
  {
    entityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class RemoveComponentMutation extends Schema.TaggedClass<RemoveComponentMutation>()(
  "RemoveComponent",
  {
    entityId: EntityId,
    componentTag: ComponentTag
  }
) {}

/**
 * Create new entity in game state
 * Emitted by discovery/creation systems
 */
export class CreateEntityMutation extends Schema.TaggedClass<CreateEntityMutation>()(
  "CreateEntity",
  {
    entity: Entity
  }
) {}

/**
 * Transfer item between entities
 * Atomic operation that removes from one inventory and adds to another
 */
export class TransferItemMutation extends Schema.TaggedClass<TransferItemMutation>()(
  "TransferItem",
  {
    itemId: EntityId,
    fromEntityId: EntityId,
    toEntityId: EntityId
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
  CreateEntityMutation,
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
