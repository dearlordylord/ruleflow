/**
 * Dashboard - TUI display of simulation results
 * Uses ANSI escape codes for animated display
 */
/* eslint-disable no-console -- CLI tool, console output is intentional */
/* eslint-disable functional/immutable-data -- local array building for display, not domain logic */
import { Effect } from "effect"

import type { Entity } from "../domain/entity.js"
import { getComponent } from "../domain/entity.js"
import type { DomainEvent } from "../domain/events.js"
import { runAnimatedSimulation, simulationLayer } from "./SimulationRunner.js"

// ANSI color codes
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

const FG_RED = "\x1b[31m"
const FG_GREEN = "\x1b[32m"
const FG_YELLOW = "\x1b[33m"
const FG_BLUE = "\x1b[34m"
const FG_MAGENTA = "\x1b[35m"
const FG_CYAN = "\x1b[36m"
const FG_WHITE = "\x1b[37m"
const FG_GRAY = "\x1b[90m"

const BG_BLUE = "\x1b[44m"

function box(title: string, content: string, width: number = 70): string {
  const lines = content.split("\n")
  const topBorder = `${FG_GRAY}┌${"─".repeat(width - 2)}┐${RESET}`
  const bottomBorder = `${FG_GRAY}└${"─".repeat(width - 2)}┘${RESET}`
  const titleLine = `${FG_GRAY}│${RESET} ${BOLD}${FG_YELLOW}${title.padEnd(width - 4)}${RESET} ${FG_GRAY}│${RESET}`

  const contentLines = lines.map(line => {
    const strippedLen = line.replace(/\x1b\[[0-9;]*m/g, "").length
    const padding = Math.max(0, width - 4 - strippedLen)
    return `${FG_GRAY}│${RESET} ${line}${" ".repeat(padding)} ${FG_GRAY}│${RESET}`
  })

  return [topBorder, titleLine, ...contentLines, bottomBorder].join("\n")
}

function formatEvent(event: DomainEvent, index: number, isActive: boolean): string {
  const num = String(index + 1).padStart(2)
  const tag = event._tag
  let detail = ""
  let color = FG_WHITE

  switch (event._tag) {
    case "CharacterCreationStarted":
      detail = `entity=${event.entityId.slice(0, 8)}...`
      color = FG_GREEN
      break
    case "AttributesRolled":
      detail = `STR=${event.strength} DEX=${event.dexterity} CON=${event.constitution}`
      color = FG_GREEN
      break
    case "ClassChosen":
      detail = `class=${event.class}`
      color = FG_GREEN
      break
    case "WeaponGroupSpecializationChosen":
      detail = `group=${event.weaponGroup}`
      color = FG_GREEN
      break
    case "SkillsChosen":
      detail = `primary=${event.primarySkills.slice(0, 2).join(",")}`
      color = FG_GREEN
      break
    case "TraitChosen":
      detail = `trait=${event.traitName}`
      color = FG_GREEN
      break
    case "HitPointsRolled":
      detail = `roll=${event.rolledValue}+${event.constitutionModifier}`
      color = FG_GREEN
      break
    case "StartingMoneyRolled":
      detail = `silver=${event.silverAmount}`
      color = FG_GREEN
      break
    case "AlignmentChosen":
      detail = `align=${event.alignment}`
      color = FG_GREEN
      break
    case "NameChosen":
      detail = `name=${event.name}`
      color = FG_GREEN
      break
    case "CharacterCreationCompleted":
      detail = "done"
      color = FG_GREEN
      break
    case "CreatureDiscovered":
      detail = `${event.name} appears`
      color = FG_CYAN
      break
    case "CombatStarted":
      detail = `${event.participants.length} combatants`
      color = FG_RED
      break
    case "CombatEnded":
      detail = `${event.victor} wins (${event.roundsElapsed} rounds)`
      color = FG_GREEN
      break
    case "InitiativeRolled":
      detail = `roll=${event.roll} total=${event.total}`
      color = FG_YELLOW
      break
    case "CombatRoundStarted":
      detail = `Round ${event.roundNumber} - ${event.activeSide}`
      color = FG_MAGENTA
      break
    case "CombatRoundEnded":
      detail = `Round ${event.roundNumber} over`
      color = FG_GRAY
      break
    case "TurnStarted":
      detail = `${event.entityId.slice(0, 8)}... acts`
      color = FG_BLUE
      break
    case "TurnEnded":
      detail = `${event.entityId.slice(0, 8)}... done`
      color = FG_GRAY
      break
    case "MonsterDamageInflicted":
      detail = `${event.source} deals ${event.damageAmount} dmg`
      color = FG_RED
      break
    case "AttackPerformed":
      detail = `roll=${event.attackRoll} ${event.attackerId.slice(0, 8)}...→${event.targetId.slice(0, 8)}...`
      color = FG_RED
      break
    case "CurrencyTransferred":
      detail = `${event.silver}sp ${event.fromEntityId.slice(0, 8)}...→${event.toEntityId.slice(0, 8)}...`
      color = FG_YELLOW
      break
    case "CharacterDied":
      detail = `${event.entityId.slice(0, 8)}... HP=${event.finalHP}`
      color = FG_RED
      break
    default:
      detail = tag
  }

  const shortTag = tag.length > 25 ? tag.slice(0, 22) + "..." : tag
  const prefix = isActive ? `${BOLD}▶ ` : "  "
  const suffix = isActive ? ` ◀${RESET}` : ""
  return `${prefix}${color}${num}. ${shortTag.padEnd(26)} ${FG_GRAY}${detail}${RESET}${suffix}`
}

function formatEntity(entity: Entity): string {
  const lines: Array<string> = []
  const id = entity.id.slice(0, 8)

  // Get name from CharacterCreation or Creature component
  const charCreation = getComponent(entity, "CharacterCreation")
  const creature = getComponent(entity, "Creature")
  const name = charCreation?.name ?? creature?.name ?? id

  // Check if this is a dead creature (corpse)
  const corpse = getComponent(entity, "Corpse")
  const deadMarker = corpse ? ` ${FG_RED}[DEAD]${RESET}` : ""

  lines.push(`${BOLD}${FG_CYAN}${name}${RESET}${deadMarker} ${FG_GRAY}(${id}...)${RESET}`)

  // For minimal creature entities (monsters), just show the name
  if (creature && !charCreation) {
    return lines.join("\n")
  }

  // Attributes
  const attrs = getComponent(entity, "Attributes")
  if (attrs) {
    lines.push(
      `  ${FG_WHITE}STR:${FG_YELLOW}${attrs.strength}${RESET} ${FG_WHITE}DEX:${FG_YELLOW}${attrs.dexterity}${RESET} ${FG_WHITE}CON:${FG_YELLOW}${attrs.constitution}${RESET}`
    )
    lines.push(
      `  ${FG_WHITE}INT:${FG_YELLOW}${attrs.intelligence}${RESET} ${FG_WHITE}WIL:${FG_YELLOW}${attrs.will}${RESET} ${FG_WHITE}CHA:${FG_YELLOW}${attrs.charisma}${RESET}`
    )
  }

  // Health
  const health = getComponent(entity, "Health")
  if (health) {
    const hpColor = health.current <= 0 ? FG_RED : health.current < health.max / 2 ? FG_YELLOW : FG_GREEN
    lines.push(`  ${FG_WHITE}HP: ${hpColor}${health.current}${FG_GRAY}/${FG_WHITE}${health.max}${RESET}`)
  }

  // Combat Stats
  const combat = getComponent(entity, "CombatStats")
  if (combat) {
    lines.push(
      `  ${FG_WHITE}AC:${FG_MAGENTA}${combat.armorClass}${RESET} ${FG_WHITE}Melee:${FG_GREEN}+${combat.meleeAttackBonus}${RESET} ${FG_WHITE}Ranged:${FG_GREEN}+${combat.rangedAttackBonus}${RESET}`
    )
  }

  // Currency
  const currency = getComponent(entity, "Currency")
  if (currency) {
    const parts: Array<string> = []
    if (currency.platinum > 0) parts.push(`${currency.platinum}pp`)
    if (currency.gold > 0) parts.push(`${currency.gold}gp`)
    if (currency.silver > 0) parts.push(`${FG_YELLOW}${currency.silver}sp${RESET}`)
    if (currency.copper > 0) parts.push(`${currency.copper}cp`)
    if (parts.length > 0) {
      lines.push(`  ${FG_WHITE}Currency: ${parts.join(" ")}`)
    }
  }

  // Class
  const cls = getComponent(entity, "Class")
  if (cls) {
    lines.push(`  ${FG_WHITE}Class: ${FG_BLUE}${cls.class}${RESET} ${FG_GRAY}Lvl ${cls.level}${RESET}`)
  }

  // Weapon (for weapon entities)
  const weapon = getComponent(entity, "Weapon")
  if (weapon) {
    lines.push(`  ${FG_WHITE}Weapon: ${FG_MAGENTA}${weapon.name}${RESET} (${weapon.damageDice})`)
  }

  // Skills - show only non-untrained
  const skills = getComponent(entity, "Skills")
  if (skills) {
    const primary: Array<string> = []
    if (skills.melee.proficiency === "Primary") primary.push("Melee")
    if (skills.accuracy.proficiency === "Primary") primary.push("Accuracy")
    if (skills.stealth.proficiency === "Primary") primary.push("Stealth")
    if (skills.awareness.proficiency === "Primary") primary.push("Awareness")
    if (skills.survival.proficiency === "Primary") primary.push("Survival")
    if (skills.medicine.proficiency === "Primary") primary.push("Medicine")
    if (primary.length > 0) {
      lines.push(`  ${FG_WHITE}Skills: ${FG_GREEN}${primary.join(", ")}${RESET}`)
    }
  }

  // Traits
  const traits = getComponent(entity, "Traits")
  if (traits && traits.activeTrait.length > 0) {
    lines.push(`  ${FG_WHITE}Traits: ${FG_MAGENTA}${traits.activeTrait.join(", ")}${RESET}`)
  }

  return lines.join("\n")
}

export function renderDashboard(
  processedEvents: ReadonlyArray<DomainEvent>,
  currentEventIndex: number,
  entities: ReadonlyArray<Entity>,
  totalEvents: number
): void {
  console.clear()

  // Header
  console.log(`\n${BG_BLUE}${FG_WHITE}${BOLD}  SIMULATION DASHBOARD  ${RESET}`)
  console.log(`${FG_GRAY}Events: ${currentEventIndex + 1}/${totalEvents} | Entities: ${entities.length}${RESET}\n`)

  // Events section - show processed events
  const eventsContent = processedEvents.length > 0
    ? processedEvents.map((e, i) => formatEvent(e, i, i === currentEventIndex)).join("\n")
    : `${FG_GRAY}(waiting for events...)${RESET}`
  console.log(box("EVENTS", eventsContent, 70))

  console.log()

  // Entities section
  const entitiesContent = entities.length > 0
    ? entities.map(e => formatEntity(e)).join("\n\n")
    : `${FG_GRAY}(no entities yet)${RESET}`
  console.log(box("ENTITIES", entitiesContent, 70))

  console.log()
}

async function main() {
  console.clear()
  console.log(`${FG_CYAN}Initializing simulation...${RESET}`)

  await Effect.runPromise(
    runAnimatedSimulation(renderDashboard, 1000).pipe(Effect.provide(simulationLayer))
  )

  console.log(`${FG_GREEN}${BOLD}Simulation complete!${RESET}\n`)
}

main().catch(console.error)
