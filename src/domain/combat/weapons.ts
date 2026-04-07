/**
 * Weapons - All weapon types, groups, and properties
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"
import { DamageType, DiceNotation, WeaponGroup, WeaponSize, WeaponTrait } from "./weaponTypes.js"

// Re-export shared types so consumers can keep importing from weapons
export { DamageType, DiceNotation, WeaponGroup, WeaponSize, WeaponTrait } from "./weaponTypes.js"

export class WeaponComponent extends Schema.TaggedClass<WeaponComponent>()("Weapon", {
  name: Schema.NonEmptyString,
  damageDice: DiceNotation,
  damageType: Schema.Array(DamageType), // Some weapons have multiple types
  weaponGroup: WeaponGroup,
  size: WeaponSize,
  traits: Schema.Array(WeaponTrait),

  // Melee weapons
  reach: Schema.Int.pipe(Schema.greaterThanOrEqualTo(5)), // feet, default 5

  // Ranged weapons
  rangeClose: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),
  rangeMedium: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),
  rangeLong: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0))),

  // Durability
  durability: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  maxDurability: Schema.Int.pipe(Schema.greaterThan(0))
}) {}

/**
 * Weapon Specialization tracking (Fighter class)
 */
export class WeaponSpecializationComponent
  extends Schema.TaggedClass<WeaponSpecializationComponent>()("WeaponSpecialization", {
    // Map weapon group to damage bonus (+1 per specialization level)
    specializations: Schema.HashMap({
      key: WeaponGroup,
      value: Schema.Int.pipe(Schema.greaterThan(0))
    })
  })
{}

const EquippedWeaponsState = Schema.Union(
  Schema.Struct({
    _type: Schema.Literal("Unarmed"),
    equippedAmmunition: Schema.NullOr(EntityId)
  }),
  Schema.Struct({
    _type: Schema.Literal("OneHanded"),
    mainHand: EntityId,
    offHand: Schema.NullOr(EntityId), // Can dual-wield or use shield
    equippedAmmunition: Schema.NullOr(EntityId)
  }),
  Schema.Struct({
    _type: Schema.Literal("TwoHanded"),
    weapon: EntityId, // No offHand field exists
    equippedAmmunition: Schema.NullOr(EntityId)
  })
)
export type EquippedWeaponsState = typeof EquippedWeaponsState.Type

/**
 * Equipped weapon tracking
 */
export class EquippedWeaponsComponent extends Schema.TaggedClass<EquippedWeaponsComponent>()("EquippedWeapons", {
  state: EquippedWeaponsState
}) {}
