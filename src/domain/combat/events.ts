/**
 * Combat Domain Events
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

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

export class DamageDealt extends Schema.TaggedClass<DamageDealt>()(
  "DamageDealt",
  {
    attackerId: EntityId,
    targetId: EntityId,
    damageAmount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    damageType: Schema.Literal("Crushing", "Piercing", "Slashing"),
    isCritical: Schema.Boolean
  }
) {}

export class GrappleAttempted extends Schema.TaggedClass<GrappleAttempted>()(
  "GrappleAttempted",
  {
    grapplerInd: EntityId,
    targetId: EntityId,
    grapplerRoll: Schema.Int,
    targetRoll: Schema.Int,
    success: Schema.Boolean
  }
) {}

export class CombatStarted extends Schema.TaggedClass<CombatStarted>()(
  "CombatStarted",
  {
    participants: Schema.Array(EntityId),
    surprisedParticipants: Schema.Array(EntityId),
    roundNumber: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class CombatEnded extends Schema.TaggedClass<CombatEnded>()(
  "CombatEnded",
  {
    roundsElapsed: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    victor: Schema.NullOr(Schema.Literal("Players", "Enemies", "None"))
  }
) {}

export class InitiativeRolled extends Schema.TaggedClass<InitiativeRolled>()(
  "InitiativeRolled",
  {
    entityId: EntityId,
    roll: Schema.Int.pipe(Schema.between(1, 6)),
    total: Schema.Int
  }
) {}

export class WeaponDamaged extends Schema.TaggedClass<WeaponDamaged>()(
  "WeaponDamaged",
  {
    weaponId: EntityId,
    rollWasNaturalOne: Schema.Boolean,
    currentDurability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class ArmorDamaged extends Schema.TaggedClass<ArmorDamaged>()(
  "ArmorDamaged",
  {
    armorId: EntityId,
    attackRollWasNatural20: Schema.Boolean,
    currentDurability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class WeaponEquipped extends Schema.TaggedClass<WeaponEquipped>()(
  "WeaponEquipped",
  {
    entityId: EntityId,
    weaponId: EntityId,
    hand: Schema.Literal("MainHand", "OffHand", "TwoHanded")
  }
) {}

export class WeaponUnequipped extends Schema.TaggedClass<WeaponUnequipped>()(
  "WeaponUnequipped",
  {
    entityId: EntityId,
    weaponId: EntityId,
    hand: Schema.Literal("MainHand", "OffHand")
  }
) {}

export class ArmorEquipped extends Schema.TaggedClass<ArmorEquipped>()(
  "ArmorEquipped",
  {
    entityId: EntityId,
    armorId: EntityId
  }
) {}

export class ArmorUnequipped extends Schema.TaggedClass<ArmorUnequipped>()(
  "ArmorUnequipped",
  {
    entityId: EntityId,
    armorId: EntityId
  }
) {}

export class ShieldEquipped extends Schema.TaggedClass<ShieldEquipped>()(
  "ShieldEquipped",
  {
    entityId: EntityId,
    shieldId: EntityId
  }
) {}

export class ShieldUnequipped extends Schema.TaggedClass<ShieldUnequipped>()(
  "ShieldUnequipped",
  {
    entityId: EntityId,
    shieldId: EntityId
  }
) {}

export class EquipmentRepaired extends Schema.TaggedClass<EquipmentRepaired>()(
  "EquipmentRepaired",
  {
    repairerId: EntityId,
    equipmentId: EntityId,
    repairKitId: EntityId,
    durabilityRestored: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}
