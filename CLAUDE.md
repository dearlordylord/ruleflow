# Effect Project Instructions

Rules are reflexive: when adding a rule, apply it immediately.

## Package Manager

**Use pnpm, not npm.** This project uses pnpm-lock.yaml. Prefer package.json scripts over raw commands (e.g., `pnpm typecheck` not `pnpm tsc --noEmit`).

## Environment

- Local secrets live in `.env`. Do not commit real tokens.
- Copy `.env.example` to `.env` when setting up a new machine.
- `OPENROUTER_API_KEY` is the token for the transcript interpreter's future live LLM layer.
- Get that token from the OpenRouter dashboard's API Keys page, then place it in `.env` as `OPENROUTER_API_KEY=...`.
- `WHISPER_MODEL` controls the local Whisper model for recorded-audio transcription. Default: `tiny.en`.
- `WHISPER_LANGUAGE` controls the language hint passed to local Whisper. Default: `en`.
- Local Whisper runs through `uv run` and currently supports recorded `.wav` files only. This avoids an `ffmpeg` dependency inside the Docker devcontainer.
- First real Whisper run will download the model weights into the local cache. Use `pnpm demo:audio -- path/to/file.wav` to smoke-test the backend.

## Type Safety

Type casts (`as T`) are a sin. Avoid them. All data crossing system boundaries (APIs etc.) must be strongly typed with Effect Schema. Use `satisfies` for registry data, type guards for narrowing, and discriminated union narrowing for events.

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

## Project Harness

Quality gates that must all pass:

1. **Typecheck** (`pnpm typecheck`): strict mode, zero errors.
2. **Lint** (`pnpm lint`): ESLint + jscpd duplication detection (2% threshold).
3. **Circular dependency detection** (`pnpm circular`): madge catches import cycles.
4. **Tests** (`pnpm test`): vitest, all must pass.
5. **Test coverage**: TODO — add `@vitest/coverage-v8` with 99% thresholds.
6. **Pre-commit hooks** (`.husky/pre-commit`): lint-staged + gitleaks secrets scanning.
7. **Formatting** (`pnpm format` / `pnpm check-format`): dprint rules via ESLint.

**Unified gate:** `pnpm check-all` (runs typecheck + lint + circular + test).

## Pre-Commit Verification

**Before committing (especially in worktrees), run all checks:**

```bash
pnpm check-all
```

If any fail, fix and re-run. Don't commit until all pass.

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
