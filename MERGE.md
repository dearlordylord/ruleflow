# Equipment System Merge Problem

## Context

**Location:** `/Users/firfi/work/typescript/osr-hellenvald-equipment` (worktree)
**Branch:** `feature/equipment-purchase-system`
**Commit:** `ce4e2cd` - Implement equipment purchase and management systems
**Base:** `d96a165` (old master with 45 TypeScript errors)
**Target:** Merge onto fresh master `1ee5e36` (all errors fixed)

**Status:** Equipment implementation complete and code-review approved (864 lines: 3 systems, 9 events, 5 mutations, 10 mutation handlers, 28 weapons, 8 armor, 40+ items).

**Problem:** 153 TypeScript errors when running `pnpm tsc --noEmit` in equipment worktree.

---

## Root Cause: entity.ts vs components.ts

### Current Codebase Architecture

The codebase has **duplicate definitions** in two files:

**src/domain/entity.ts** (NEW - intended as single source of truth):
```typescript
// Line 133
export class Entity extends Schema.TaggedClass<Entity>()("Entity", {
  id: EntityId,
  components: Schema.Array(Component)
}) {}

// Lines 141+
export function getComponent<T extends ComponentTag>(...) {...}
export function setComponent(...) {...}
export function removeComponent(...) {...}
```

**src/domain/components.ts** (LEGACY - kept for backward compatibility):
```typescript
// Line 213
export class Entity extends Schema.TaggedClass<Entity>()("Entity", {
  id: EntityId,
  components: Schema.Array(Component)
}) {}

// Lines 219+
export function getComponent<T extends ComponentTag>(...) {...}
export function setComponent(...) {...}
export function removeComponent(...) {...}
```

**Both files export IDENTICAL definitions.**

### Current Usage Pattern

**Entire codebase uses components.ts** (the "legacy" file):
```typescript
// ALL existing files do this:
import type { Entity } from "../components.js"
import { getComponent, setComponent } from "../components.js"
```

Files using components.ts:
- `src/domain/systems/*.ts` (all systems)
- `src/domain/infrastructure/GameState.ts` (master branch)
- `src/domain/infrastructure/helpers.ts` (master branch)
- `src/domain/infrastructure/ReadModelStore.ts`
- All other infrastructure

**Only domain/index.ts re-exports from entity.ts** - no other file uses it.

---

## What Equipment Work Did Wrong

Equipment commit `ce4e2cd` **changed GameState.ts imports** from components.js → entity.js:

```diff
File: src/domain/infrastructure/GameState.ts

-import type { Entity } from "../components.js"
-import { CurrencyComponent, getComponent, HealthComponent, removeComponent, setComponent } from "../components.js"
+import { Entity, getComponent, removeComponent, setComponent } from "../entity.js"
+import { CurrencyComponent } from "../inventory/currency.js"
+import { InventoryComponent } from "../inventory/items.js"
+// ... other direct imports
```

**Similar change in helpers.ts** (need to verify exact diff).

---

## Why This Causes 153 Errors

TypeScript treats `Entity` from entity.js and `Entity` from components.js as **nominally different types** despite being structurally identical.

**The conflict:**
1. GameState.ts imports `Entity` from entity.js
2. Systems still import `Entity` from components.js
3. GameState methods return `Effect<Entity>` (from entity.js)
4. Systems expect `Effect<Entity>` (from components.js)
5. TypeScript error: **"Type 'Entity from entity.ts' is not assignable to 'Entity from components.ts'"**

**Fresh master (1ee5e36):** All files use components.js consistently → 0 errors
**Equipment worktree:** Mixed usage (GameState uses entity.js, systems use components.js) → 153 errors

---

## Error Examples

```
src/domain/infrastructure/GameState.ts(39,17): error TS2375:
Type 'Effect<Entity from entity.ts>' is not assignable to type 'Effect<Entity from components.ts>'

src/domain/infrastructure/GameState.ts(39,48): error TS2345:
Argument of type 'Entity from components.ts' is not assignable to parameter of type 'Entity from entity.ts'
```

All 153 errors are variations of this Entity type mismatch between the two files.

---

## The Fix

**Change equipment worktree imports back to components.js to match rest of codebase.**

### File 1: src/domain/infrastructure/GameState.ts

**Current (WRONG):**
```typescript
import { Entity, getComponent, removeComponent, setComponent } from "../entity.js"
import { CurrencyComponent } from "../inventory/currency.js"
import { InventoryComponent } from "../inventory/items.js"
import { ConsumableComponent } from "../inventory/consumables.js"
import { HealthComponent, CharacterCreationComponent } from "../character/index.js"
import { WeaponComponent, EquippedWeaponsComponent } from "../combat/weapons.js"
import { ArmorComponent, ShieldComponent, EquippedArmorComponent } from "../combat/index.js"
import { CombatStatsComponent } from "../combat/stats.js"
```

**Should be (CORRECT):**
```typescript
import type { Entity } from "../components.js"
import { getComponent, removeComponent, setComponent } from "../components.js"
import { CurrencyComponent } from "../inventory/currency.js"
import { InventoryComponent } from "../inventory/items.js"
import { ConsumableComponent } from "../inventory/consumables.js"
import { HealthComponent, CharacterCreationComponent } from "../character/index.js"
import { WeaponComponent, EquippedWeaponsComponent } from "../combat/weapons.js"
import { ArmorComponent, ShieldComponent, EquippedArmorComponent } from "../combat/index.js"
import { CombatStatsComponent } from "../combat/stats.js"
```

**Key change:** Import `Entity` as type-only from components.js, import helpers from components.js.

### File 2: src/domain/infrastructure/helpers.ts

Check if this file also changed imports. If so, apply same fix (use components.js).

---

## Equipment Work Modified Files

Equipment commit added/modified 22 files. Only 2 have the import issue:

**Files with WRONG imports (need fix):**
- `src/domain/infrastructure/GameState.ts` - uses entity.js, should use components.js
- `src/domain/infrastructure/helpers.ts` - check if changed, fix if needed

**Files that are FINE (equipment-specific changes):**
- `src/domain/combat/equippedArmor.ts` (NEW)
- `src/domain/equipment/index.ts` (NEW)
- `src/domain/equipment/loadSizes.ts` (NEW)
- `src/domain/equipment/prices.ts` (NEW)
- `src/domain/systems/itemPurchase.ts` (NEW - 201 lines)
- `src/domain/systems/equipment.ts` (NEW - 434 lines)
- `src/domain/systems/durability.ts` (NEW - 229 lines)
- `src/domain/combat/events.ts` (added 7 equipment events)
- `src/domain/combat/mutations.ts` (added 4 mutations)
- `src/domain/combat/weapons.ts` (added 10 weapons)
- `src/domain/entity.ts` (added EquippedArmor to component union)
- `src/domain/inventory/consumables.ts` (added durabilityPool)
- `src/domain/inventory/items.ts` (40+ items)
- Other event/mutation/index files

---

## Verification Steps

After fixing imports:

```bash
cd /Users/firfi/work/typescript/osr-hellenvald-equipment

# 1. Fix GameState.ts imports (see above)
# 2. Check/fix helpers.ts imports if needed

# 3. Verify 0 TypeScript errors
pnpm tsc --noEmit

# Should show only lint warnings (schemaSyncInEffect), no errors

# 4. Commit the fix
git add src/domain/infrastructure/GameState.ts
git add src/domain/infrastructure/helpers.ts  # if changed
git commit -m "Fix GameState/helpers imports to use components.js consistently"
```

---

## Additional Context

### Why Two Files Exist

From `src/domain/index.ts`:
```typescript
// Entity and component system
export * from "./entity.js"  // NEW intended design

// Legacy components for backward compatibility (can be removed later)
// Importing from old components.ts if needed
```

Migration from components.ts → entity.ts is **incomplete**. The codebase still uses components.ts everywhere.

**Note:** Completing the migration (deleting components.ts, moving all imports to entity.ts) is **separate work** and not part of this fix. This fix only makes equipment work match the current codebase convention.

---

## Summary

**What happened:** Equipment work accidentally used entity.js imports in GameState.ts/helpers.ts instead of components.js.

**Why it broke:** TypeScript treats Entity from entity.js ≠ Entity from components.js (nominal typing).

**The fix:** Change GameState.ts (and helpers.ts if needed) to import from components.js like rest of codebase.

**Expected outcome:** 0 TypeScript errors, equipment work ready to merge.
