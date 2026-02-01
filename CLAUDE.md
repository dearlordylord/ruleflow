# Effect Project Instructions

## Package Manager

**Use pnpm, not npm.** This project uses pnpm-lock.yaml.

<!-- effect-solutions:start -->
## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `.reference/effect/` for real implementations (run `effect-solutions setup` first)

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.
<!-- effect-solutions:end -->

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for event sourcing flow, layer deps, file locations.

**Key rules:**
- Systems are pure: read `ReadonlyGameState`, return `Mutation`s, no side effects
- Components are data-only; derived values → utility functions (pure ECS)
- Cross-entity logic → systems

## Pre-Commit Verification

**Before committing (especially in worktrees), run all checks:**

```bash
pnpm tsc --noEmit && pnpm lint --fix && pnpm test
```

If any fail, fix and re-run the full chain. Don't commit until all three pass.

**Lint warnings = 0.** If a warning is an intentional architectural choice, add `eslint-disable-next-line` with explanation:
```typescript
// eslint-disable-next-line functional/immutable-data -- local mutation, converted to Chunk on return
```

## Rulebook is Source of Truth

**When in doubt, grep the rulebook. When challenged, grep the rulebook. When confident, still grep the rulebook.**

The `rulebook/` directory contains the authoritative game rules. Before making assumptions about:
- Weapon groups, damage types, equipment stats
- Class abilities, traits, skills
- Combat formulas, modifiers, bonuses
- Any game mechanic

Search the rulebook first: `grep -ri "keyword" rulebook/`

Don't trust assumptions. Don't trust memory. Verify against the source.

## Domain Events

**Domain events = observable in-game actions with business/rules significance.**

They represent what players/NPCs **do** in the game world, NOT infrastructure operations.

Examples:
- ✅ `AttackPerformed`, `CurrencyTransferred`, `MysteryCast` - game actions
- ❌ `EntityCreated`, `ComponentSet`, `AttributesSet` - setup/infrastructure

**Rule:** If you can say "When [EVENT] happens, the [SYSTEM] should..." → It's a domain event.
If you need words like "setup" or "initialize" to explain it → It's infrastructure, not an event.
