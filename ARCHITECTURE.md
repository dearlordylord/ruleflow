# Architecture

## Core Principle: Player Perspective

State = what the player knows, not what "exists." DM reveals → it becomes true. No hidden world state precedes discovery.

## Event Sourcing Flow

```
DomainEvent → Systems → Mutations → GameState → ReadModelStore
     ↓
  EventLog (persisted, source of truth)
```

- **Events**: What happened. Immutable. Replayable.
- **Systems**: Process events, emit mutations. Pure.
- **Mutations**: State changes. Data only.
- **GameState**: Applies mutations. Infrastructure.

## Systems Are Pure

```typescript
type System = (
  state: ReadonlyGameState,  // read-only
  events: Chunk<DomainEvent>,
  accumulatedMutations: Chunk<Mutation>
) => Effect<Chunk<Mutation>, ...>  // returns mutations, no side effects
```

**Rules:**
- Read from `ReadonlyGameState` - never mutate
- Return `Mutation`s - never call external services
- No database, no HTTP, no randomness (inject `DiceRoller`)
- Validation before mutation generation

## Components Are Data-Only

Pure ECS: components = data, functions = logic.

```typescript
class AttributesComponent { strength, dexterity, ... }  // data only
export function getStrengthMod(attrs: AttributesComponent): number  // utility
```

Exception: `static applyMutation()` for mutation→component conversion.

## Layer Dependencies

```
Components ← Systems ← Infrastructure
    ↓           ↓            ↓
  Events    Services    EventLog/GameState
```

- Components: no imports from systems/infrastructure
- Systems: import components, services. No infrastructure.
- Infrastructure: imports everything, orchestrates

## File Locations

| Concern | Location |
|---------|----------|
| Entity/components | `/src/domain/{subdomain}/` |
| Domain events | `/src/domain/{subdomain}/events.ts` or `/src/domain/events.ts` |
| Business logic | `/src/domain/systems/` |
| Pure services | `/src/domain/services/` |
| State/persistence | `/src/domain/infrastructure/` |
