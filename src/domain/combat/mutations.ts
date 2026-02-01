/**
 * Combat Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import { ConditionWithData } from "./conditions.js"

/**
 * Condition type for removal (only needs the _type to identify which condition to remove)
 */
export const ConditionTypeToRemove = Schema.Literal(
  "Vulnerable",
  "Prone",
  "Grappled",
  "Restrained",
  "Blinded",
  "Deafened",
  "Stunned",
  "Paralyzed",
  "Unconscious",
  "Poisoned",
  "Diseased",
  "Exhausted",
  "Frightened",
  "Charmed",
  "Invisible",
  "Hidden",
  "Concentrating"
)
export type ConditionTypeToRemove = typeof ConditionTypeToRemove.Type

export class AddConditionMutation extends Schema.TaggedClass<AddConditionMutation>()(
  "AddCondition",
  {
    entityId: EntityId,
    condition: ConditionWithData
  }
) {}

export class RemoveConditionMutation extends Schema.TaggedClass<RemoveConditionMutation>()(
  "RemoveCondition",
  {
    entityId: EntityId,
    conditionType: ConditionTypeToRemove
  }
) {}

export class SetGrappleStateMutation extends Schema.TaggedClass<SetGrappleStateMutation>()(
  "SetGrappleState",
  {
    entityId: EntityId,
    grappledBy: Schema.NullOr(EntityId),
    isPinned: Schema.Boolean
  }
) {}

export class RollInitiativeMutation extends Schema.TaggedClass<RollInitiativeMutation>()(
  "RollInitiative",
  {
    entityId: EntityId,
    roll: Schema.Int.pipe(Schema.between(1, 6)),
    modifier: Schema.Int
  }
) {}

export class UseActionMutation extends Schema.TaggedClass<UseActionMutation>()(
  "UseAction",
  {
    entityId: EntityId,
    actionType: Schema.Literal("Main", "Movement", "Bonus", "Full")
  }
) {}

export class EquipWeaponMutation extends Schema.TaggedClass<EquipWeaponMutation>()(
  "EquipWeapon",
  {
    entityId: EntityId,
    weaponId: EntityId,
    hand: Schema.Literal("MainHand", "OffHand", "TwoHanded")
  }
) {}

export class UnequipWeaponMutation extends Schema.TaggedClass<UnequipWeaponMutation>()(
  "UnequipWeapon",
  {
    entityId: EntityId,
    hand: Schema.Literal("MainHand", "OffHand")
  }
) {}

export class EquipArmorMutation extends Schema.TaggedClass<EquipArmorMutation>()(
  "EquipArmor",
  {
    entityId: EntityId,
    armorId: EntityId
  }
) {}

export class EquipShieldMutation extends Schema.TaggedClass<EquipShieldMutation>()(
  "EquipShield",
  {
    entityId: EntityId,
    shieldId: EntityId
  }
) {}

export class DamageEquipmentMutation extends Schema.TaggedClass<DamageEquipmentMutation>()(
  "DamageEquipment",
  {
    equipmentId: EntityId,
    damage: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class ReloadWeaponMutation extends Schema.TaggedClass<ReloadWeaponMutation>()(
  "ReloadWeapon",
  {
    weaponId: EntityId,
    actionsSpent: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class ConsumeAmmunitionMutation extends Schema.TaggedClass<ConsumeAmmunitionMutation>()(
  "ConsumeAmmunition",
  {
    ammunitionId: EntityId,
    quantity: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class UnequipArmorMutation extends Schema.TaggedClass<UnequipArmorMutation>()(
  "UnequipArmor",
  {
    entityId: EntityId
  }
) {}

export class UnequipShieldMutation extends Schema.TaggedClass<UnequipShieldMutation>()(
  "UnequipShield",
  {
    entityId: EntityId
  }
) {}

export class RepairEquipmentMutation extends Schema.TaggedClass<RepairEquipmentMutation>()(
  "RepairEquipment",
  {
    equipmentId: EntityId,
    durabilityRestored: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class UpdateCombatStatsMutation extends Schema.TaggedClass<UpdateCombatStatsMutation>()(
  "UpdateCombatStats",
  {
    entityId: EntityId,
    armorClass: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    meleeAttackBonus: Schema.Int,
    rangedAttackBonus: Schema.Int,
    initiativeModifier: Schema.Int
  }
) {}
