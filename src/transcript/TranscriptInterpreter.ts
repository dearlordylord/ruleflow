/**
 * TranscriptInterpreter — Effect service that converts natural language
 * transcript segments into candidate domain events.
 *
 * Layers:
 * - mockLayer: Pattern-matching against known phrases. Deterministic, no LLM.
 * - (future) liveLayer: LLM-backed interpretation with caching.
 *
 * ⚡ Electric field: In the D&D project, candidates are validated against
 * Quint spec guards (hard reject) instead of Hellenvald's soft consistency
 * warnings (burden scoring). The interpreter interface stays the same —
 * only the downstream validation changes.
 */
import { Context, Effect, Layer } from "effect"

import type { EntityId } from "../domain/entities.js"
import type { DomainEvent } from "../domain/events.js"
import { AttackPerformed, DefenseStanceTaken, MovementPerformed, WithdrawalDeclared } from "../domain/events.js"
import type { TranscriptInterpretationError } from "./errors.js"
import type { TranscriptSegment } from "./TranscriptSegment.js"

// ---------------------------------------------------------------------------
// Entity context — what the interpreter knows about the world
// ---------------------------------------------------------------------------

export interface EntitySummary {
  readonly id: EntityId
  readonly name: string
  readonly type: "character" | "creature"
}

/**
 * Minimal world context the interpreter needs to resolve natural language
 * references ("the goblin", "I", "him") into entity IDs.
 *
 * ⚡ Electric field: In the D&D project this would be derived from DndContext
 * (machine snapshot) rather than hand-built.
 */
export interface InterpretationContext {
  readonly entities: ReadonlyArray<EntitySummary>
  /** The character who is speaking / whose turn it is */
  readonly activeCharacterId: EntityId
  /** Weapon currently equipped by the active character (for attack events) */
  readonly activeWeaponId: EntityId | null
}

// ---------------------------------------------------------------------------
// Candidate interpretation
// ---------------------------------------------------------------------------

export interface CandidateInterpretation {
  readonly event: DomainEvent
  readonly confidence: number
  /** Human-readable reasoning for this interpretation */
  readonly reasoning: string
}

// ---------------------------------------------------------------------------
// Service definition
// ---------------------------------------------------------------------------

export class TranscriptInterpreter extends Context.Tag("@game/TranscriptInterpreter")<
  TranscriptInterpreter,
  {
    /**
     * Interpret transcript segments into candidate domain events.
     *
     * Returns an empty array when the input is not actionable
     * (e.g., "hmm let me think", chatter, out-of-game talk).
     *
     * Returns multiple candidates when the input is ambiguous
     * (e.g., "I attack" when multiple targets exist).
     */
    readonly interpret: (
      segments: ReadonlyArray<TranscriptSegment>,
      context: InterpretationContext
    ) => Effect.Effect<ReadonlyArray<CandidateInterpretation>, TranscriptInterpretationError>
  }
>() {
  /**
   * Mock layer: deterministic pattern matching on segment text.
   * No LLM, no network — fully cacheable and replayable.
   *
   * Patterns are intentionally simple. The mock proves the pipeline
   * architecture; the live LLM layer replaces the matching logic.
   */
  static readonly mockLayer = Layer.succeed(TranscriptInterpreter, {
    interpret: (segments, context) =>
      Effect.sync(() => {
        const text = segments.map((s) => s.text).join(" ").toLowerCase()
        return matchPatterns(text, context)
      })
  })
}

// ---------------------------------------------------------------------------
// Mock pattern matching (internal)
// ---------------------------------------------------------------------------

function resolveTarget(name: string, context: InterpretationContext): EntitySummary | undefined {
  const lower = name.toLowerCase()
  return context.entities.find((e) => e.id !== context.activeCharacterId && e.name.toLowerCase().includes(lower))
}

function allTargets(context: InterpretationContext): ReadonlyArray<EntitySummary> {
  return context.entities.filter((e) => e.id !== context.activeCharacterId && e.type === "creature")
}

function matchPatterns(
  text: string,
  context: InterpretationContext
): ReadonlyArray<CandidateInterpretation> {
  // --- Attack with named target ---
  const attackNamed = text.match(/(?:i )?(?:attack|swing at|hit|strike)\s+(?:the\s+)?(\w+)/)
  if (attackNamed) {
    const targetName = attackNamed[1]
    const target = resolveTarget(targetName, context)
    if (target && context.activeWeaponId) {
      const rollMatch = text.match(/(?:rolled?\s+(?:a\s+)?)?(\d+)/)
      const roll = rollMatch ? Math.min(20, Math.max(1, parseInt(rollMatch[1], 10))) : null
      const rollAfterTarget = rollMatch && attackNamed.index !== undefined && rollMatch.index !== undefined
        && rollMatch.index > attackNamed.index
      const attackRoll = roll !== null && rollAfterTarget ? roll : 10

      return [{
        event: AttackPerformed.make({
          attackerId: context.activeCharacterId,
          targetId: target.id,
          weaponId: context.activeWeaponId,
          attackRoll
        }),
        confidence: 0.9,
        reasoning: `Unambiguous attack on ${target.name}`
      }]
    }
  }

  // --- Attack without target (ambiguous if multiple creatures) ---
  const attackGeneric = text.match(/(?:i )?(?:attack|swing|hit|strike)(?:\s|$)/)
  if (attackGeneric && context.activeWeaponId) {
    const weaponId = context.activeWeaponId
    const targets = allTargets(context)
    if (targets.length === 1) {
      return [{
        event: AttackPerformed.make({
          attackerId: context.activeCharacterId,
          targetId: targets[0].id,
          weaponId,
          attackRoll: 10
        }),
        confidence: 0.85,
        reasoning: `Attack with only one target available: ${targets[0].name}`
      }]
    }
    if (targets.length > 1) {
      return targets.map((target) => ({
        event: AttackPerformed.make({
          attackerId: context.activeCharacterId,
          targetId: target.id,
          weaponId,
          attackRoll: 10
        }),
        confidence: 0.5,
        reasoning: `Ambiguous attack — could target ${target.name}`
      }))
    }
  }

  // --- Movement ---
  const moveMatch = text.match(/(?:i )?(?:move|walk|run|advance)\s+(\d+)\s*(?:feet|ft)?/)
  if (moveMatch) {
    const distance = parseInt(moveMatch[1], 10)
    return [{
      event: MovementPerformed.make({
        entityId: context.activeCharacterId,
        distanceMoved: distance,
        isWithdrawal: false,
        isRetreat: false
      }),
      confidence: 0.9,
      reasoning: `Move ${distance} feet`
    }]
  }

  // --- Withdrawal ---
  if (text.match(/(?:i )?withdraw/)) {
    return [{
      event: WithdrawalDeclared.make({
        entityId: context.activeCharacterId
      }),
      confidence: 0.85,
      reasoning: "Withdrawal declared"
    }]
  }

  // --- Defense stance ---
  if (text.match(/(?:i )?(?:defend|take (?:a )?defensive stance|go defensive|total defense)/)) {
    return [{
      event: DefenseStanceTaken.make({
        entityId: context.activeCharacterId
      }),
      confidence: 0.9,
      reasoning: "Defensive stance"
    }]
  }

  // --- Non-actionable input ---
  return []
}
