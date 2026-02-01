/**
 * Currency System
 */
import { Schema } from "effect"

/**
 * Four coin types with conversion rates
 * 1 copper (cm)
 * 10 copper = 1 silver (cm)
 * 100 copper = 10 silver = 1 gold (zm)
 * 1000 copper = 100 silver = 10 gold = 1 platinum (pm)
 */
export class CurrencyComponent extends Schema.TaggedClass<CurrencyComponent>()("Currency", {
  copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {
  get totalCopper(): number {
    return this.copper
      + (this.silver * 10)
      + (this.gold * 100)
      + (this.platinum * 1000)
  }

  get totalInGold(): number {
    return this.totalCopper / 100
  }
}

/**
 * Convert copper to higher denominations
 */
export function convertCurrency(copperAmount: number): {
  platinum: number
  gold: number
  silver: number
  copper: number
} {
  const platinum = Math.floor(copperAmount / 1000)
  let remaining = copperAmount % 1000

  const gold = Math.floor(remaining / 100)
  remaining = remaining % 100

  const silver = Math.floor(remaining / 10)
  const copper = remaining % 10

  return { platinum, gold, silver, copper }
}

/**
 * Check if entity has sufficient funds
 */
export function hasSufficientFunds(
  currency: CurrencyComponent,
  costInCopper: number
): boolean {
  return currency.totalCopper >= costInCopper
}
