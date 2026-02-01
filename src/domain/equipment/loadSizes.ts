/**
 * Equipment Load Size Mappings
 * Maps weapon/armor sizes to inventory load sizes for encumbrance calculation
 */

import type { WeaponSize } from "../combat/weapons.js"
import type { LoadSize } from "../inventory/items.js"

/**
 * Map weapon size to load size for encumbrance
 *
 * From rulebook 08_Adventures.md lines 202-231:
 * - Standard item (one-handed weapons, shields, tools) = +1 load
 * - Large item (two-handed weapons, large weapons) = +2 load
 * - Miniature items: 3 miniature = 1 standard (so 1 miniature ≈ 0.33 load)
 *
 * Weapon size mapping:
 * - Miniature (Dagger, Sling): Small LoadSize (0.5 ≈ 0.33)
 * - Small (Club, Hand Axe, Cutlass, Short Sword, Pistol): Standard (1)
 * - Medium (Mace, Longsword, Saber, Short Bow): Standard (1)
 * - Large (Greatsword, Halberd, Longbow, Arquebus): Large (2)
 * - Massive: Massive (4) - for exceptionally large items
 */
export function weaponSizeToLoadSize(weaponSize: WeaponSize): LoadSize {
  switch (weaponSize) {
    case "Miniature":
      return "Small" // 0.5 load (approximates 0.33 from "3 miniature = 1 standard")
    case "Small":
      return "Standard" // 1 load (one-handed weapons per rulebook)
    case "Medium":
      return "Standard" // 1 load (one-handed weapons per rulebook)
    case "Large":
      return "Large" // 2 load (two-handed/large weapons per rulebook)
    case "Massive":
      return "Massive" // 4 load (exceptional items)
  }
}

/**
 * Armor load sizes
 * Note: Worn armor DOES count toward encumbrance per user clarification
 *
 * From rulebook 08_Adventures.md lines 187-199:
 * - Leather Clothing = +1 load
 * - Quilted Clothing = +2 load
 * - Scale Armor = +3 load
 * - Chain Mail = +4 load
 * - Plate Armor = +5 load
 * - Full Plate = +6 load
 *
 * Our LoadSize values:
 * - Small = 0.5, Standard = 1, Large = 2, Massive = 4
 *
 * Since armor has custom values (1-6), we approximate:
 * - +1 → Standard (1)
 * - +2 → Large (2)
 * - +3 → Large (2) - approximation, actual is 3
 * - +4 → Massive (4)
 * - +5 → Massive (4) - approximation, actual is 5
 * - +6 → Massive (4) - approximation, actual is 6
 *
 * TODO: Consider adding armor-specific load calculation instead of using LoadSize enum
 */
export const ARMOR_LOAD_SIZES: Record<string, LoadSize> = {
  "No Protection": "Small", // No load
  "Leather Clothing": "Standard", // +1
  "Quilted Clothing": "Large", // +2
  "Scale Armor": "Large", // +3 (approximated as 2)
  "Chain Mail": "Massive", // +4
  "Plate Armor": "Massive", // +5 (approximated as 4)
  "Full Plate": "Massive", // +6 (approximated as 4)
  Shield: "Standard" // +1 (standard item per rulebook)
}
