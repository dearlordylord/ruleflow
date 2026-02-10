import { Box, Text } from "ink"
import React from "react"

import type { EntityId } from "../../domain/entities.js"
import type { Entity } from "../../domain/entity.js"
import { getComponent } from "../../domain/entity.js"

interface EntityPanelProps {
  readonly entities: ReadonlyMap<EntityId, Entity>
}

const hpBar = (current: number, max: number, width = 10): string => {
  const ratio = Math.max(0, Math.min(1, current / max))
  const filled = Math.round(ratio * width)
  const empty = width - filled
  return "\u2588".repeat(filled) + "\u2591".repeat(empty)
}

interface EntitySummary {
  readonly name: string
  readonly hp: { current: number; max: number } | null
  readonly ac: number | null
  readonly silver: number | null
  readonly isDead: boolean
}

interface EntitySummaryWithId extends EntitySummary {
  readonly entityId: string
}

const summarizeEntity = (entity: Entity): EntitySummaryWithId | null => {
  const health = getComponent(entity, "Health")
  const combat = getComponent(entity, "CombatStats")
  const currency = getComponent(entity, "Currency")
  const charCreation = getComponent(entity, "CharacterCreation")
  const attrs = getComponent(entity, "Attributes")

  // Skip weapon entities and entities with no meaningful display data
  const weapon = getComponent(entity, "Weapon")
  if (weapon && !health) return null

  // Derive name
  const name = charCreation?.name ?? (attrs ? "Creature" : null)
  if (!name && !health) return null

  return {
    entityId: entity.id,
    name: name ?? entity.id.slice(-4),
    hp: health ? { current: health.current, max: health.max } : null,
    ac: combat?.armorClass ?? null,
    silver: currency?.silver ?? null,
    isDead: health ? health.current <= 0 : false
  }
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ entities }) => {
  const summaries: Array<EntitySummaryWithId> = []
  for (const entity of entities.values()) {
    const s = summarizeEntity(entity)
    if (s) summaries.push(s)
  }

  if (summaries.length === 0) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>No entities yet</Text>
      </Box>
    )
  }

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
      {summaries.map((s) => (
        <Text key={s.entityId}>
          <Text bold color={s.isDead ? "red" : "white"}>{s.name}</Text>
          {s.hp && (
            <Text>
              {" "}HP: <Text color={s.isDead ? "red" : s.hp.current < s.hp.max ? "yellow" : "green"}>
                {hpBar(s.hp.current, s.hp.max)}
              </Text>
              {" "}{s.hp.current}/{s.hp.max}
            </Text>
          )}
          {s.ac !== null && <Text>  AC:{s.ac}</Text>}
          {s.silver !== null && <Text>  Silver:{s.silver}</Text>}
          {s.isDead && <Text color="red"> [DEAD]</Text>}
        </Text>
      ))}
    </Box>
  )
}
