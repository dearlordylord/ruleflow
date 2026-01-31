/**
 * Phase 1 Components: Attributes, Health, Class, Combat Stats, Weapon, Item
 */
import { Schema } from "effect"
import { EntityId } from "./entities.js"

// OSR formula: (attribute - 10) / 2 rounded down
const calculateModifier = (attribute: number): number =>
  Math.floor((attribute - 10) / 2)

export class AttributesComponent extends Schema.Class<AttributesComponent>("Attributes")({
  strength: Schema.Int.pipe(Schema.between(3, 18)),
  dexterity: Schema.Int.pipe(Schema.between(3, 18)),
  intelligence: Schema.Int.pipe(Schema.between(3, 18)),
  will: Schema.Int.pipe(Schema.between(3, 18)),
  constitution: Schema.Int.pipe(Schema.between(3, 18)),
  charisma: Schema.Int.pipe(Schema.between(3, 18))
}) {
  get strengthMod() { return calculateModifier(this.strength) }
  get dexterityMod() { return calculateModifier(this.dexterity) }
  get intelligenceMod() { return calculateModifier(this.intelligence) }
  get willMod() { return calculateModifier(this.will) }
  get constitutionMod() { return calculateModifier(this.constitution) }
  get charismaMod() { return calculateModifier(this.charisma) }
}

export class HealthComponent extends Schema.Class<HealthComponent>("Health")({
  current: Schema.Int,
  max: Schema.Int.pipe(Schema.greaterThan(0)),
  traumaActive: Schema.Boolean,
  traumaEffect: Schema.NullOr(
    Schema.Literal("Bleeding", "Unconscious", "Wounded")
  )
}) {}

export const CharacterClass = Schema.Literal("Fighter", "Specialist", "Mystic")
export type CharacterClass = typeof CharacterClass.Type

export class ClassComponent extends Schema.Class<ClassComponent>("Class")({
  class: CharacterClass,
  level: Schema.Int.pipe(Schema.between(1, 10))
}) {}

export class CombatStatsComponent extends Schema.Class<CombatStatsComponent>("CombatStats")({
  meleeAttackBonus: Schema.Int,
  rangedAttackBonus: Schema.Int,
  armorClass: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export const WeaponGroup = Schema.Literal(
  "Axes", "Blades", "Bows", "Brawling", "Clubs", "Crossbows",
  "Flails", "Polearms", "Slings", "Spears", "Staves", "Thrown"
)
export type WeaponGroup = typeof WeaponGroup.Type

export class WeaponComponent extends Schema.Class<WeaponComponent>("Weapon")({
  name: Schema.NonEmptyString,
  damageDice: Schema.NonEmptyString, // e.g. "1d8", "2d6"
  weaponGroup: WeaponGroup,
  traits: Schema.Array(Schema.String)
}) {}

export const LoadSize = Schema.Literal("Small", "Standard", "Large")
export type LoadSize = typeof LoadSize.Type

export class ItemComponent extends Schema.Class<ItemComponent>("Item")({
  name: Schema.NonEmptyString,
  loadSize: LoadSize,
  quantity: Schema.Int.pipe(Schema.greaterThan(0))
}) {
  get loadValue(): number {
    const base = this.loadSize === "Small" ? 0.5 : this.loadSize === "Large" ? 2 : 1
    return base * this.quantity
  }
}

export class InventoryComponent extends Schema.Class<InventoryComponent>("Inventory")({
  items: Schema.Array(EntityId),
  loadCapacity: Schema.Number.pipe(Schema.greaterThan(0)),
  currentLoad: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export class CurrencyComponent extends Schema.Class<CurrencyComponent>("Currency")({
  copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {
  get totalCopper(): number {
    return this.copper + (this.silver * 10) + (this.gold * 100)
  }
}

export class ArmorComponent extends Schema.Class<ArmorComponent>("Armor")({
  baseAC: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  armorType: Schema.String,
  encumbrancePenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export class SpecializationComponent extends Schema.Class<SpecializationComponent>("Specialization")({
  weaponGroups: Schema.Array(WeaponGroup),
  bonusDamage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export const Component = Schema.Union(
  AttributesComponent,
  HealthComponent,
  ClassComponent,
  CombatStatsComponent,
  WeaponComponent,
  ItemComponent,
  InventoryComponent,
  CurrencyComponent,
  ArmorComponent,
  SpecializationComponent
)
export type Component = typeof Component.Type

export const ComponentTag = Schema.Literal(
  "Attributes",
  "Health",
  "Class",
  "CombatStats",
  "Weapon",
  "Item",
  "Inventory",
  "Currency",
  "Armor",
  "Specialization"
)
export type ComponentTag = typeof ComponentTag.Type

export function getComponentTag(component: Component): ComponentTag {
  if (component instanceof AttributesComponent) return "Attributes"
  if (component instanceof HealthComponent) return "Health"
  if (component instanceof ClassComponent) return "Class"
  if (component instanceof CombatStatsComponent) return "CombatStats"
  if (component instanceof WeaponComponent) return "Weapon"
  if (component instanceof ItemComponent) return "Item"
  if (component instanceof InventoryComponent) return "Inventory"
  if (component instanceof CurrencyComponent) return "Currency"
  if (component instanceof ArmorComponent) return "Armor"
  if (component instanceof SpecializationComponent) return "Specialization"
  throw new Error("Unknown component type")
}

// Entity with components
export class Entity extends Schema.Class<Entity>("Entity")({
  id: EntityId,
  components: Schema.HashMap({ key: ComponentTag, value: Component })
}) {}
