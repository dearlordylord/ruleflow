/**
 * Combat Systems
 */
import { Effect, Chunk, HashMap, Option } from "effect"
import type { System } from "./types.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import {
  AttributesComponent,
  CombatStatsComponent,
  HealthComponent,
  WeaponComponent,
  SpecializationComponent
} from "../components.js"
import { DealDamageMutation, SetHealthMutation } from "../mutations.js"
import { CombatResolver } from "../services/CombatResolver.js"

function getSpecializationBonus(
  entity: any,
  weaponGroup: string
): number {
  const specOpt = HashMap.get(entity.components, "Specialization")
  if (Option.isNone(specOpt)) return 0
  const spec = specOpt.value
  if (!(spec instanceof SpecializationComponent)) return 0
  return spec.weaponGroups.includes(weaponGroup as any) ? spec.bonusDamage : 0
}

export const combatToHitSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const attackMutations = Chunk.filter(
      pendingMutations,
      (m) => m._tag === "PerformAttack"
    )

    const damageMutations: typeof DealDamageMutation.Type[] = []
    const combat = yield* CombatResolver

    for (const attack of attackMutations) {
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

      const attrsOpt = HashMap.get(attacker.components, "Attributes")
      const combatStatsOpt = HashMap.get(attacker.components, "CombatStats")
      const weaponCompOpt = HashMap.get(weapon.components, "Weapon")
      const targetCombatOpt = HashMap.get(target.components, "CombatStats")

      if (
        Option.isNone(attrsOpt) ||
        Option.isNone(combatStatsOpt) ||
        Option.isNone(weaponCompOpt) ||
        Option.isNone(targetCombatOpt)
      ) {
        continue
      }

      const attrs = attrsOpt.value
      const combatStats = combatStatsOpt.value
      const weaponComp = weaponCompOpt.value
      const targetCombat = targetCombatOpt.value

      if (
        !(attrs instanceof AttributesComponent) ||
        !(combatStats instanceof CombatStatsComponent) ||
        !(weaponComp instanceof WeaponComponent) ||
        !(targetCombat instanceof CombatStatsComponent)
      ) {
        continue
      }

      const hit = combat.resolveToHit(
        attack.attackRoll,
        combatStats.meleeAttackBonus,
        attrs.strengthMod,
        targetCombat.armorClass
      )

      if (hit) {
        const damage = yield* combat.calculateDamage(
          weaponComp.damageDice,
          attrs.strengthMod,
          getSpecializationBonus(attacker, weaponComp.weaponGroup),
          attack.isCritical
        )

        damageMutations.push(
          DealDamageMutation.make({
            entityId: attack.targetId,
            amount: damage,
            source: attack.attackerId
          })
        )
      }
    }

    return Chunk.fromIterable(damageMutations)
  })

export const traumaSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const damageMutations = Chunk.filter(
      pendingMutations,
      (m) => m._tag === "DealDamage"
    )

    const traumaMutations: typeof SetHealthMutation.Type[] = []

    for (const damage of damageMutations) {
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

      const healthOpt = HashMap.get(entity.components, "Health")
      if (Option.isNone(healthOpt)) continue

      const health = healthOpt.value
      if (!(health instanceof HealthComponent)) continue

      const newHP = health.current - damage.amount

      if (newHP <= 0 && !health.traumaActive) {
        traumaMutations.push(
          SetHealthMutation.make({
            entityId: damage.entityId,
            data: {
              traumaActive: true,
              traumaEffect: "Bleeding"
            }
          })
        )
      }
    }

    return Chunk.fromIterable(traumaMutations)
  })
