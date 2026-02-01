# Equipment Purchase System - Implementation Plan

## Overview
Complete equipment purchase, management, and durability system for OSR Hellenvald using event-sourced architecture.

---

## 1. Completed Work

### ✅ Equipment Definitions
**Files:**
- `src/domain/combat/weapons.ts` - 28 weapons (complete)
- `src/domain/combat/armor.ts` - 8 armor types (complete)
- `src/domain/inventory/items.ts` - 40+ common items (complete)

**Missing weapons added:**
- Cutlass, War Pick, Pollaxe
- Kriegsmesser, Saber, Falchion
- Battle Flail, Morningstar
- Sling, Javelin

**Prices converted:**
- Rulebook: см (silver) → Code: copper (×10)
- Example: Longsword 50 см → 500 copper

### ✅ Equipment Prices
**File:** `src/domain/equipment/prices.ts`

```typescript
WEAPON_PRICES: {
  Longsword: 500,      // 50 см
  Dagger: 100,         // 10 см
  // ... 28 total
}

ARMOR_PRICES: {
  "Chain Mail": 2500,  // 250 см
  Shield: 150,         // 15 см
  // ... 8 total
}
```

### ✅ Load Size Mappings
**File:** `src/domain/equipment/loadSizes.ts`

```typescript
weaponSizeToLoadSize(weaponSize):
  Miniature → Small (0.5)
  Small → Standard (1)
  Medium → Standard (1)
  Large → Large (2)
  Massive → Massive (4)
```

**TODO:** Recheck this mapping against rulebook

**Armor load:** Worn armor DOES count toward encumbrance

### ✅ Domain Events
**Added to `src/domain/inventory/events.ts`:**
- `ItemDiscarded` - player discards item

**Added to `src/domain/combat/events.ts`:**
- `WeaponEquipped/Unequipped`
- `ArmorEquipped/Unequipped`
- `ShieldEquipped/Unequipped`
- `EquipmentRepaired`

**Existing events:**
- `ItemPurchased`, `ItemSold`, `ConsumableUsed`
- `CurrencyTransferred`
- `WeaponDamaged`, `ArmorDamaged`

### ✅ Mutations
**Added to `src/domain/inventory/mutations.ts`:**
- `UpdateInventoryLoadMutation`

**Added to `src/domain/combat/mutations.ts`:**
- `UnequipArmorMutation`
- `UnequipShieldMutation`
- `RepairEquipmentMutation`
- `UpdateCombatStatsMutation`

**Existing mutations:**
- `AddItemMutation`, `RemoveItemMutation`
- `DebitCurrencyMutation`, `CreditCurrencyMutation`
- `TransferItemMutation`, `UseConsumableMutation`
- `EquipWeaponMutation`, `UnequipWeaponMutation`
- `EquipArmorMutation`, `EquipShieldMutation`
- `DamageEquipmentMutation`

---

## 2. Components Needed

### ✅ Existing Components
```typescript
// Inventory
ItemComponent { name, loadSize, quantity, isStackable, valueInCopper }
InventoryComponent { items, loadCapacity, currentLoad }
CurrencyComponent { copper, silver, gold, platinum }
ConsumableComponent { type, usesRemaining, maxUses, effect, saveDC, effectDice }

// Combat
WeaponComponent { name, damageDice, damageType, weaponGroup, size, traits, reach, ranges, durability, maxDurability }
ArmorComponent { name, baseAC, armorCategory, movementPenalty, stealthPenalty, durability, maxDurability }
ShieldComponent { name, acBonus, bashDamage, durability, maxDurability }
EquippedWeaponsComponent { mainHand, offHand, equippedAmmunition }
CombatStatsComponent { ac, attackBonus, initiativeBonus }
```

### ❌ Missing Component (Optional)
```typescript
// src/domain/combat/equippedArmor.ts
EquippedArmorComponent {
  _tag: "EquippedArmor"
  armorId: EntityId | null
  shieldId: EntityId | null
}
```

**Decision:** Not strictly needed. Can track via components directly.

### ❌ Vendor Component (Optional)
```typescript
// src/domain/inventory/vendor.ts
VendorInventoryComponent {
  _tag: "VendorInventory"
  stockItems: EntityId[]
  buysPriceModifier: number  // e.g., 0.5 (buys at 50%)
  sellsPriceModifier: number // e.g., 1.0 (sells at list)
}
```

**Decision:** Deferred. Vendor pricing handled in system logic for now.

---

## 3. Systems to Implement

### System 1: itemPurchaseSystem
**File:** `src/domain/systems/itemPurchase.ts`

**Processes:** `ItemPurchased` events

**Validation:**
1. Check buyer has sufficient currency (`CurrencyComponent.totalCopper >= priceInCopper`)
2. Check buyer has inventory space (encumbrance validation)
3. Verify item exists
4. If seller specified, verify seller owns item

**Emits mutations:**
```typescript
DebitCurrencyMutation { entityId: buyerId, copper: priceInCopper }
CreditCurrencyMutation { entityId: sellerId, copper: priceInCopper } // if seller exists
TransferItemMutation { itemId, from: sellerId, to: buyerId }         // if seller exists
AddItemMutation { entityId: buyerId, itemId }                        // if no seller (spawn new)
UpdateInventoryLoadMutation { entityId: buyerId, newLoad: currentLoad + itemLoad }
```

**Error handling:**
- Insufficient funds → `DomainError("Encumbrance", "Buyer has insufficient currency")`
- Overencumbered → `DomainError("Encumbrance", "Adding item exceeds load capacity")`

---

### System 2: equipmentSystem
**File:** `src/domain/systems/equipment.ts`

**Processes:**
- `WeaponEquipped`, `WeaponUnequipped`
- `ArmorEquipped`, `ArmorUnequipped`
- `ShieldEquipped`, `ShieldUnequipped`

**Weapon Equip Validation:**
1. Item is in character's inventory
2. Weapon not already equipped
3. If mainHand/offHand occupied → auto-unequip first
4. If two-handed weapon → both hands must be free
5. If shield equipped + two-handed weapon → auto-unequip shield

**Armor Equip Validation:**
1. Item is in inventory
2. STR requirements met:
   - Heavy armor: STR ≥ 13
   - Medium armor: STR ≥ 11
3. If armor already worn → auto-unequip first

**Shield Equip Validation:**
1. Item is in inventory
2. One hand must be free (check `EquippedWeaponsComponent`)
3. If shield already held → auto-unequip first

**Emits mutations:**
```typescript
// Weapon equip
UnequipWeaponMutation { entityId, hand } // if slot occupied
EquipWeaponMutation { entityId, weaponId, hand }
UpdateCombatStatsMutation { entityId, ac, attackBonus }

// Armor equip
UnequipArmorMutation { entityId, armorId } // if already wearing
EquipArmorMutation { entityId, armorId }
UpdateCombatStatsMutation { entityId, ac: armorAC + dexMod + shieldBonus, attackBonus }

// Shield equip
UnequipShieldMutation { entityId, shieldId } // if already holding
EquipShieldMutation { entityId, shieldId }
UpdateCombatStatsMutation { entityId, ac: currentAC + 1, attackBonus }
```

**AC Calculation:**
```typescript
baseAC = ArmorComponent.baseAC (or 11 if no armor)
dexModCapped = min(dexMod, armorCategory === "Light" ? Infinity : armorCategory === "Medium" ? 2 : 0)
shieldBonus = ShieldComponent ? ShieldComponent.acBonus : 0
finalAC = baseAC + dexModCapped + shieldBonus
```

---

### System 3: durabilitySystem
**File:** `src/domain/systems/durability.ts`

**Processes:**
- `WeaponDamaged`
- `ArmorDamaged`
- `EquipmentRepaired`

**Weapon Damaged:**
- Triggered when attack roll = natural 1
- Reduces durability by 1
- If durability reaches 0 → destroy weapon

**Armor Damaged:**
- Triggered when defender is hit by attack roll = natural 20
- Reduces durability by 1
- If durability reaches 0 → destroy armor

**Equipment Repaired:**
- Uses `ConsumableComponent` (Repair Kit) with durability pool
- Repair kit has `maxUses: 1`, `durabilityPool: 10`
- Restores durability up to `maxDurability` (cannot exceed)

**Emits mutations:**
```typescript
// Weapon/Armor damaged
DamageEquipmentMutation { equipmentId, damage: 1 }
RemoveItemMutation { entityId, itemId } // if durability = 0

// Equipment repaired
RepairEquipmentMutation { equipmentId, durabilityRestored }
UseConsumableMutation { consumableId: repairKitId, targetId: equipmentId, usesConsumed: durabilityRestored }
```

**Durability Defaults:**
- TODO: Determine default `maxDurability` values (not in rulebook)
- Suggested: Weapons=20, Armor=30, Shields=15

---

## 4. Transaction Flows

### Flow 1: Equipment Purchase
```
Player: "Buy Longsword (50 silver = 500 copper)"
  ↓
1. Emit: ItemPurchased { buyerId, sellerId: vendorId, itemId, priceInCopper: 500 }
  ↓
2. itemPurchaseSystem validates:
   - vendorEntity has longsword in inventory ✓
   - buyerEntity.CurrencyComponent.totalCopper >= 500 ✓
   - buyerEntity.InventoryComponent: (currentLoad + 1) <= loadCapacity ✓
  ↓
3. System emits mutations:
   - DebitCurrencyMutation { buyerId, copper: 500 }
   - CreditCurrencyMutation { sellerId: vendorId, copper: 500 }
   - TransferItemMutation { itemId: longswordId, from: vendorId, to: buyerId }
   - UpdateInventoryLoadMutation { buyerId, newLoad: currentLoad + 1 }
  ↓
4. Mutations applied → Buyer owns longsword, vendor has 500 copper
```

**Error scenarios:**
- Buyer has 400 copper → `DomainError("Currency", "Insufficient funds: need 500, have 400")`
- Buyer load capacity 10, current load 9.5, longsword load 1 → `DomainError("Encumbrance", "Adding item would exceed capacity: 10.5 > 10")`

---

### Flow 2: Weapon Equipping
```
Player: Drags longsword to main hand slot
  ↓
1. Emit: WeaponEquipped { entityId: playerId, weaponId: longswordId, hand: "MainHand" }
  ↓
2. equipmentSystem validates:
   - playerEntity.InventoryComponent.items includes longswordId ✓
   - longswordId not already in EquippedWeaponsComponent ✓
   - mainHand currently has daggerId
  ↓
3. Check weapon traits:
   - Longsword has "Versatile" → can use 1H or 2H
   - Equipping as 1H (MainHand)
  ↓
4. System emits mutations:
   - UnequipWeaponMutation { entityId: playerId, hand: "MainHand" } // unequip dagger
   - EquipWeaponMutation { entityId: playerId, weaponId: longswordId, hand: "MainHand" }
   - UpdateCombatStatsMutation { entityId: playerId, ac: 13, attackBonus: +3 }
  ↓
5. Mutations applied → Longsword equipped in main hand, dagger unequipped, AC updated
```

---

### Flow 3: Armor Equipping
```
Player: Equips Chain Mail
  ↓
1. Emit: ArmorEquipped { entityId: playerId, armorId: chainMailId }
  ↓
2. equipmentSystem validates:
   - playerEntity has chain mail in Inventory ✓
   - Chain Mail is Medium armor → requires STR ≥ 11
   - playerEntity.AttributesComponent.strength = 14 ✓
   - Currently wearing leatherArmorId
  ↓
3. System emits mutations:
   - UnequipArmorMutation { entityId: playerId, armorId: leatherArmorId }
   - EquipArmorMutation { entityId: playerId, armorId: chainMailId }
   - UpdateCombatStatsMutation {
       entityId: playerId,
       ac: 15 + min(dexMod, 2) + shieldBonus,
       attackBonus: currentAttackBonus
     }
  ↓
4. Mutations applied → Chain mail worn, AC = 15 + capped dex + shield
```

---

### Flow 4: Equipment Repair
```
Player: Uses Repair Kit on Damaged Longsword (durability: 8/20)
  ↓
1. Emit: EquipmentRepaired {
     repairerId: playerId,
     equipmentId: longswordId,
     repairKitId: kitId,
     durabilityRestored: 5
   }
  ↓
2. durabilitySystem validates:
   - repairKitEntity.ConsumableComponent.usesRemaining > 0 ✓
   - repairKitEntity.ConsumableComponent.durabilityPool >= 5 ✓
   - longswordEntity.WeaponComponent.durability < maxDurability ✓
  ↓
3. System emits mutations:
   - RepairEquipmentMutation { equipmentId: longswordId, durabilityRestored: 5 }
   - UseConsumableMutation { consumableId: kitId, targetId: longswordId, usesConsumed: 5 }
  ↓
4. Mutations applied → Longsword durability: 13/20, repair kit pool: 5 remaining
```

---

### Flow 5: Item Discard
```
Player: Drops dagger (over-encumbered)
  ↓
1. Emit: ItemDiscarded { entityId: playerId, itemId: daggerId, reason: "PlayerChoice" }
  ↓
2. No system processing (direct mutation trigger)
  ↓
3. Emit mutations:
   - RemoveItemMutation { entityId: playerId, itemId: daggerId }
   - UpdateInventoryLoadMutation { entityId: playerId, newLoad: currentLoad - 0.5 }
  ↓
4. Mutations applied → Dagger removed, load reduced by 0.5
```

---

## 5. Integration Points

### Currency Validation
- System: `itemPurchaseSystem`
- Helper: `hasSufficientFunds(currency: CurrencyComponent, costInCopper: number): boolean`
- Located: `src/domain/inventory/currency.ts`

### Encumbrance Validation
- System: `encumbranceValidationSystem` (existing)
- Validates: `AddItemMutation` against `InventoryComponent.loadCapacity`
- Located: `src/domain/systems/encumbrance.ts`
- **Enhancement needed:** Emit `UpdateInventoryLoadMutation` after successful add/remove

### Combat Stats Calculation
- System: `equipmentSystem`
- Triggered by: Equip/Unequip events
- Recalculates:
  - `CombatStatsComponent.ac` from armor + shield + dex
  - `CombatStatsComponent.attackBonus` from equipped weapon + attributes + specialization

### Durability Tracking
- System: `durabilitySystem`
- Triggered by: `WeaponDamaged`, `ArmorDamaged` events (emitted during combat)
- Destroys item if `durability` reaches 0

---

## 6. Files to Create

```
src/domain/systems/itemPurchase.ts        - Purchase validation system
src/domain/systems/equipment.ts           - Equip/unequip system
src/domain/systems/durability.ts          - Durability tracking system
```

---

## 7. Files Modified

```
✅ src/domain/combat/weapons.ts           - Added 10 missing weapons, fixed damage dice
✅ src/domain/combat/armor.ts             - Already complete
✅ src/domain/inventory/items.ts          - Expanded COMMON_ITEMS to 40+ items
✅ src/domain/equipment/prices.ts         - Created prices table
✅ src/domain/equipment/loadSizes.ts      - Created load size mappings
✅ src/domain/inventory/events.ts         - Added ItemDiscarded
✅ src/domain/combat/events.ts            - Added equip/unequip/repair events
✅ src/domain/inventory/mutations.ts      - Added UpdateInventoryLoadMutation
✅ src/domain/combat/mutations.ts         - Added Unequip/Repair/UpdateCombatStats mutations
✅ src/domain/events.ts                   - Updated event union
✅ src/domain/mutations.ts                - Updated mutation union
```

---

## 8. Resolved Questions

### Q1: Equipment Completeness
**Answer:** ✅ Complete all missing weapons/armor/items from rulebook

### Q2: Weapon Size → Load Size Mapping
**Answer:**
- Miniature → Small (0.5)
- Small → Standard (1)
- Medium → Standard (1)
- Large → Large (2)
- **TODO:** Recheck this mapping

### Q3: Armor Load
**Answer:** ✅ Worn armor DOES count toward encumbrance

### Q4: Default Durability Values
**Answer:**
- **TODO:** Not specified in rulebook
- Suggested: Weapons=20, Armor=30, Shields=15
- Leave as TODO in component definitions

### Q5: Two-Handed Weapon Load
**Answer:** Use weapon's size-based load (Large weapons = Large load = 2)

### Q6: Equipment Prices
**Answer:** ✅ Created separate prices table (`src/domain/equipment/prices.ts`)
- Keeps component definitions clean
- Centralizes pricing logic

### Q7: Shield Components
**Answer:** Shield has both:
- `ItemComponent` (for inventory, purchasing, load)
- `ShieldComponent` (for combat stats, durability)
- An entity can have multiple components

### Q8: Vendor Price Modifiers
**Answer:** ✅ Handle pricing in `itemPurchaseSystem` logic
- Deferred vendor-specific components for now
- Can add `VendorInventoryComponent` later if needed

### Q9: Ammunition
**Answer:** ✅ Multiple singular components
- Each "Arrows (10)" is a separate `ItemComponent` with `quantity: 1`, `isStackable: true`
- Simple approach for now

### Q10: Repair Kit Mechanics
**Answer:** ✅ Durability pool
- `ConsumableComponent { maxUses: 1, durabilityPool: 10 }`
- Repairs up to 10 total durability points across multiple items
- Consumed when pool = 0

---

## 9. Implementation Order

### ✅ Phase 1: Definitions (Completed)
1. Add missing weapons
2. Expand COMMON_ITEMS
3. Create prices table
4. Create load size mappings

### ✅ Phase 2: Events & Mutations (Completed)
1. Add purchase/equip/repair events
2. Add equipment mutations
3. Update event/mutation unions

### ⏳ Phase 3: Systems (Next)
1. Implement `itemPurchaseSystem`
2. Implement `equipmentSystem`
3. Implement `durabilitySystem`
4. Enhance `encumbranceValidationSystem` to emit load mutations

### ⏳ Phase 4: Integration & Testing
1. Test purchase → equip → combat → repair flow
2. Verify encumbrance validation
3. Verify currency validation
4. Verify durability tracking
5. Verify AC/attack bonus recalculation

---

## 10. Open TODOs

1. **Load size mapping:** Recheck weapon size → load size mapping against rulebook
2. **Default durability:** Determine or research standard durability values for equipment
3. **Repair kit durability pool:** Implement `ConsumableComponent.durabilityPool` field (currently only has `usesRemaining`)
4. **Vendor pricing:** Design and implement vendor price modifiers if needed
5. **System implementation:** Implement the 3 systems described above
6. **Integration tests:** Write tests for complete purchase → equip → combat workflows

---

## Summary

**Completed:**
- ✅ 28 weapons, 8 armor types, 40+ common items
- ✅ Equipment prices table (all in copper)
- ✅ Load size mappings
- ✅ 9 new domain events
- ✅ 5 new mutations
- ✅ Updated event/mutation unions

**Next Steps:**
1. Implement `itemPurchaseSystem`
2. Implement `equipmentSystem`
3. Implement `durabilitySystem`
4. Add integration tests

**Total Files:**
- Created: 3 (`equipment/` directory)
- Modified: 11
- To Create: 3 (systems)
