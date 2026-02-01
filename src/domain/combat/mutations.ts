/**
 * Combat Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import type { Condition } from "./conditions.js"

export class AddConditionMutation extends Schema.TaggedClass<AddConditionMutation>()(
  "AddCondition",
  {
    entityId: EntityId,
    condition: Schema.Literal(
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
  }
) {}

export class RemoveConditionMutation extends Schema.TaggedClass<RemoveConditionMutation>()(
  "RemoveCondition",
  {
    entityId: EntityId,
    condition: Schema.Literal(
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
    hand: Schema.Literal("MainHand", "OffHand")
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
