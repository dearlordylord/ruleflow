/**
 * Injectable Dice Roller Service
 */
import { Effect, Context, Layer, Random } from "effect"

export class DiceRoller extends Context.Tag("@game/DiceRoller")<
  DiceRoller,
  {
    readonly roll: (dice: string) => Effect.Effect<number>
    readonly d20: () => Effect.Effect<number>
  }
>() {
  static readonly liveLayer = Layer.succeed(DiceRoller, {
    roll: (dice) => Effect.gen(function* () {
      const [count, sides] = dice.split("d").map(Number)
      let total = 0
      for (let i = 0; i < count; i++) {
        total += yield* Random.nextIntBetween(1, sides + 1)
      }
      return total
    }),
    d20: () => Random.nextIntBetween(1, 21)
  })

  // Deterministic test layer with sequence
  static readonly testLayer = (rolls: number[]) => {
    let index = 0
    return Layer.succeed(DiceRoller, {
      roll: (_) => Effect.sync(() => rolls[index++ % rolls.length]),
      d20: () => Effect.sync(() => rolls[index++ % rolls.length])
    })
  }

  // Always max rolls
  static readonly testMaxLayer = Layer.succeed(DiceRoller, {
    roll: (dice) => Effect.sync(() => {
      const [count, sides] = dice.split("d").map(Number)
      return count * sides
    }),
    d20: () => Effect.succeed(20)
  })

  // Always min rolls
  static readonly testMinLayer = Layer.succeed(DiceRoller, {
    roll: (dice) => Effect.sync(() => {
      const [count] = dice.split("d").map(Number)
      return count // 1 per die
    }),
    d20: () => Effect.succeed(1)
  })
}
