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

## Domain Events

**Domain events = observable in-game actions with business/rules significance.**

They represent what players/NPCs **do** in the game world, NOT infrastructure operations.

Examples:
- ✅ `AttackPerformed`, `CurrencyTransferred`, `MysteryCast` - game actions
- ❌ `EntityCreated`, `ComponentSet`, `AttributesSet` - setup/infrastructure

**Rule:** If you can say "When [EVENT] happens, the [SYSTEM] should..." → It's a domain event.
If you need words like "setup" or "initialize" to explain it → It's infrastructure, not an event.
