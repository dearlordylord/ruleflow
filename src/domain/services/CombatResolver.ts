/**
 * Combat Resolver Service - combat mechanics
 */
import { Context, Effect, Layer } from "effect"

import { DiceRoller } from "./DiceRoller.js"

import { DomainError } from "../errors.js"
import { SystemName } from "../entities.js"

export class CombatResolver extends Context.Tag("@game/CombatResolver")<
  CombatResolver,
  {
    readonly calculateDamage: (
      damageDice: string,
      strengthMod: number,
      specializationBonus: number,
      isCritical: boolean
    ) => Effect.Effect<number, DomainError>
    readonly resolveToHit: (
      attackRoll: number,
      attackBonus: number,
      attributeMod: number,
      targetAC: number
    ) => boolean
  }
>() {
  static readonly layer = Layer.effect(
    CombatResolver,
    Effect.gen(function*() {
      const dice = yield* DiceRoller

      const calculateDamage = (
        damageDice: string,
        strengthMod: number,
        specializationBonus: number,
        isCritical: boolean
      ) =>
        Effect.gen(function*() {
          const baseDamage = yield* dice.roll(damageDice)
          const criticalDamage = isCritical ? yield* dice.roll(damageDice) : 0
          const total = baseDamage + criticalDamage + strengthMod + specializationBonus
          return Math.max(1, total) // Minimum 1 damage
        }).pipe(
          Effect.mapError((error) =>
            DomainError.make({
              systemName: SystemName.make("CombatResolver"),
              message: `Damage calculation failed: ${error.message}`
            })
          )
        )

      const resolveToHit = (
        attackRoll: number,
        attackBonus: number,
        attributeMod: number,
        targetAC: number
      ) => {
        const total = attackRoll + attackBonus + attributeMod
        return total >= targetAC
      }

      return CombatResolver.of({ calculateDamage, resolveToHit })
    })
  )
}
