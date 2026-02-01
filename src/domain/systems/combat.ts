/**
 * Combat Systems
 */
import { Chunk, Effect, HashMap, Option } from "effect"

import type { WeaponGroup } from "../combat/weapons.js"
import { SystemName } from "../entities.js"
import type { Entity } from "../entity.js"
import { getComponent } from "../entity.js"
import { DomainError } from "../errors.js"
import type { AttackPerformed } from "../events.js"
import { DealDamageMutation, SetHealthMutation } from "../mutations.js"
import { CombatResolver } from "../services/CombatResolver.js"
import type { System } from "./types.js"

function getSpecializationBonus(
  entity: Entity,
  weaponGroup: WeaponGroup
): number {
  const spec = getComponent(entity, "WeaponSpecialization")
  if (!spec) return 0
  return HashMap.get(spec.specializations, weaponGroup).pipe(
    Option.getOrElse(() => 0)
  )
}

export const combatToHitSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const attackEvents = Chunk.filter(
      events,
      (event): event is AttackPerformed => event._tag === "AttackPerformed"
    )

    const combat = yield* CombatResolver

    const damageMutations = yield* Effect.forEach(attackEvents, (attack) =>
      Effect.gen(function*() {
        const attacker = yield* state.getEntity(attack.attackerId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CombatToHit"),
                message: `Attacker ${attack.attackerId} not found`
              })
            )
          )
        )

        const target = yield* state.getEntity(attack.targetId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CombatToHit"),
                message: `Target ${attack.targetId} not found`
              })
            )
          )
        )

        const weapon = yield* state.getEntity(attack.weaponId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CombatToHit"),
                message: `Weapon ${attack.weaponId} not found`
              })
            )
          )
        )

        const attrs = getComponent(attacker, "Attributes")
        const combatStats = getComponent(attacker, "CombatStats")
        const weaponComp = getComponent(weapon, "Weapon")
        const targetCombat = getComponent(target, "CombatStats")

        if (!attrs || !combatStats || !weaponComp || !targetCombat) {
          return Option.none()
        }

        const hit = combat.resolveToHit(
          attack.attackRoll,
          combatStats.meleeAttackBonus,
          attrs.strengthMod,
          targetCombat.armorClass
        )

        if (!hit) {
          return Option.none()
        }

        const damage = yield* combat.calculateDamage(
          weaponComp.damageDice,
          attrs.strengthMod,
          getSpecializationBonus(attacker, weaponComp.weaponGroup),
          attack.isCritical
        )

        return Option.some(
          DealDamageMutation.make({
            entityId: attack.targetId,
            amount: damage,
            source: attack.attackerId
          })
        )
      }))

    // Filter out None values and extract mutations
    return Chunk.fromIterable(damageMutations).pipe(
      Chunk.filterMap((opt) => opt)
    )
  })

export const traumaSystem: System = (state, _events, accumulatedMutations) =>
  Effect.gen(function*() {
    const damageMutations = Chunk.filter(
      accumulatedMutations,
      (m) => m._tag === "DealDamage"
    )

    const traumaMutations = yield* Effect.forEach(damageMutations, (damage) =>
      Effect.gen(function*() {
        const entity = yield* state.getEntity(damage.entityId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("Trauma"),
                message: `Entity ${damage.entityId} not found`
              })
            )
          )
        )

        const health = getComponent(entity, "Health")
        if (!health) return Option.none()

        const newHP = health.current - damage.amount

        if (newHP <= 0 && !health.traumaActive) {
          return Option.some(
            SetHealthMutation.make({
              entityId: damage.entityId,
              data: {
                traumaActive: true,
                traumaEffect: "Bleeding"
              }
            })
          )
        }

        return Option.none()
      }))

    return Chunk.fromIterable(traumaMutations).pipe(
      Chunk.filterMap((opt) => opt)
    )
  })
