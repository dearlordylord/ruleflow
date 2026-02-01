/**
 * Injectable Dice Roller Service
 */
import { Context, Effect, Layer, Random } from "effect"

export class DiceRoller extends Context.Tag("@game/DiceRoller")<
  DiceRoller,
  {
    readonly roll: (dice: string) => Effect.Effect<number, Error>
    readonly d20: () => Effect.Effect<number>
  }
>() {
  static readonly liveLayer = Layer.succeed(DiceRoller, {
    roll: (dice) =>
      Effect.gen(function*() {
        const match = dice.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/)
        if (!match) {
          return yield* Effect.fail(new Error(`Invalid dice notation: ${dice}`))
        }

        const [_, countStr, sidesStr, operator, modStr] = match
        const count = Number(countStr)
        const sides = Number(sidesStr)
        const modifier = modStr ? Number(modStr) : 0

        let total = 0
        for (let i = 0; i < count; i++) {
          total += yield* Random.nextIntBetween(1, sides + 1)
        }

        return operator === "-" ? total - modifier : total + modifier
      }),
    d20: () => Random.nextIntBetween(1, 21)
  })

  // Deterministic test layer with sequence
  static readonly testLayer = (rolls: Array<number>) => {
    let index = 0
    return Layer.succeed(DiceRoller, {
      roll: (_) => Effect.sync(() => rolls[index++ % rolls.length]),
      d20: () => Effect.sync(() => rolls[index++ % rolls.length])
    })
  }

  // Always max rolls
  static readonly testMaxLayer = Layer.succeed(DiceRoller, {
    roll: (dice) =>
      Effect.sync(() => {
        const match = dice.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/)
        if (!match) return 0

        const [_, countStr, sidesStr, operator, modStr] = match
        const count = Number(countStr)
        const sides = Number(sidesStr)
        const modifier = modStr ? Number(modStr) : 0

        const diceTotal = count * sides
        return operator === "-" ? diceTotal - modifier : diceTotal + modifier
      }),
    d20: () => Effect.succeed(20)
  })

  // Always min rolls
  static readonly testMinLayer = Layer.succeed(DiceRoller, {
    roll: (dice) =>
      Effect.sync(() => {
        const match = dice.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/)
        if (!match) return 0

        const [_, countStr, sidesStr, operator, modStr] = match
        const count = Number(countStr)
        const modifier = modStr ? Number(modStr) : 0

        const diceTotal = count // 1 per die (minimum)
        return operator === "-" ? diceTotal - modifier : diceTotal + modifier
      }),
    d20: () => Effect.succeed(1)
  })
}
