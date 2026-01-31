/**
 * Injectable UUID Generator Service
 * Allows deterministic ID generation in tests
 */
import { Effect, Context, Layer } from "effect"

export class IdGenerator extends Context.Tag("@game/IdGenerator")<
  IdGenerator,
  {
    readonly generate: () => Effect.Effect<string>
  }
>() {
  static readonly liveLayer = Layer.succeed(IdGenerator, {
    generate: () => Effect.sync(() => crypto.randomUUID())
  })

  // Deterministic test layer with fixed UUIDs
  static readonly testLayer = (ids: string[]) => {
    let index = 0
    return Layer.succeed(IdGenerator, {
      generate: () => Effect.sync(() => ids[index++ % ids.length])
    })
  }

  // Test layer with random but seeded UUIDs (simplified - just use deterministic IDs)
  static readonly seededLayer = (seed: string) =>
    IdGenerator.testLayer([`${seed}-00000001`, `${seed}-00000002`, `${seed}-00000003`])
}
