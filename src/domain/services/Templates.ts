/**
 * Weapon/Armor Templates Service
 */
import { Context, Effect, Layer } from "effect"

import type { WeaponGroup } from "../components.js"

export interface WeaponTemplate {
  readonly name: string
  readonly damageDice: string
  readonly weaponGroup: WeaponGroup
  readonly traits: Array<string>
}

export class WeaponTemplates extends Context.Tag("@game/WeaponTemplates")<
  WeaponTemplates,
  {
    readonly getTemplate: (name: string) => Effect.Effect<WeaponTemplate, never>
  }
>() {
  static readonly testLayer = Layer.succeed(WeaponTemplates, {
    getTemplate: (name) =>
      Effect.succeed({
        name,
        damageDice: name === "Longsword"
          ? "1d8"
          : name === "Dagger"
          ? "1d4"
          : name === "Greatsword"
          ? "2d6"
          : name === "Bow"
          ? "1d6"
          : "1d6",
        weaponGroup: name === "Longsword" || name === "Greatsword"
          ? "Blades"
          : name === "Dagger"
          ? "Blades"
          : name === "Bow"
          ? "Bows"
          : "Blades",
        traits: []
      })
  })
}
