# Architecture

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

## Domain Model

**Rich components** - behavior + data, not just data:

```typescript
// Good: logic in component
class AttributesComponent {
  get strengthMod() { return calculateModifier(this.strength) }
  get loadCapacity() { return this.strength * 10 }
}

// Avoid: anemic component + logic elsewhere
class HealthComponent { hp: number }  // logic scattered in systems
```

**When to use what:**
- Single-entity logic → component methods/getters
- Cross-entity logic → systems (e.g., buyer/seller/item purchase)
- Validation → schema constraints + system checks

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
