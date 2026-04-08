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
import { Context, Effect, Layer, Schema, SynchronizedRef } from "effect"

import type { EntityId } from "../domain/entities.js"
import type { DomainEvent } from "../domain/events.js"
import { AttackPerformed, DefenseStanceTaken, MovementPerformed, WithdrawalDeclared } from "../domain/events.js"
import { TranscriptInterpretationError } from "./errors.js"
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

const LiveTranscriptLlmCandidate = Schema.Struct({
  type: Schema.Literal("attack", "move", "withdraw", "defense", "none"),
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
  reasoning: Schema.NonEmptyString,
  targetName: Schema.optional(Schema.String),
  attackRoll: Schema.optional(Schema.Int),
  distanceMoved: Schema.optional(Schema.NonNegativeInt)
})

type LiveTranscriptLlmCandidate = typeof LiveTranscriptLlmCandidate.Type

const LiveTranscriptLlmResponse = Schema.Struct({
  candidates: Schema.Array(LiveTranscriptLlmCandidate)
})

type LiveTranscriptLlmResponse = typeof LiveTranscriptLlmResponse.Type

interface TranscriptLlmRequest {
  readonly text: string
  readonly context: InterpretationContext
}

export class TranscriptLlm extends Context.Tag("@game/TranscriptLlm")<
  TranscriptLlm,
  {
    readonly complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  }
>() {
  static readonly liveLayer = Layer.succeed(TranscriptLlm, {
    complete: (request) =>
      Effect.tryPromise({
        try: async () => {
          const apiKey = getEnv("OPENROUTER_API_KEY")
          if (!apiKey) {
            return Promise.reject(new Error("OPENROUTER_API_KEY is not set"))
          }

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: getEnv("OPENROUTER_MODEL") ?? "openai/gpt-4.1-mini",
              temperature: 0,
              messages: [
                {
                  role: "system",
                  content: buildSystemPrompt(request.context)
                },
                {
                  role: "user",
                  content: [
                    `Transcript: ${request.text}`,
                    "",
                    "Return JSON only."
                  ].join("\n")
                }
              ]
            })
          })

          if (!response.ok) {
            return Promise.reject(new Error(`OpenRouter request failed (${response.status})`))
          }

          const json: unknown = await response.json()
          const content = extractMessageContent(json)
          if (!content) {
            return Promise.reject(new Error("OpenRouter response did not include text content"))
          }
          const parsed: unknown = JSON.parse(content)
          return Schema.decodeUnknownSync(LiveTranscriptLlmResponse)(parsed)
        },
        catch: (error) =>
          new TranscriptInterpretationError({
            message: error instanceof Error ? error.message : "OpenRouter request failed"
          })
      })
  })

  static readonly testLayer = (
    complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  ) => Layer.succeed(TranscriptLlm, { complete })
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

  static readonly liveLayer = Layer.effect(
    TranscriptInterpreter,
    Effect.gen(function*() {
      const llm = yield* TranscriptLlm
      const cache = yield* SynchronizedRef.make(new Map<string, ReadonlyArray<CandidateInterpretation>>())

      const interpret = (
        segments: ReadonlyArray<TranscriptSegment>,
        context: InterpretationContext
      ) =>
        Effect.gen(function*() {
          const text = segments.map((segment) => segment.text).join(" ").trim()
          const cacheKey = JSON.stringify({
            activeCharacterId: context.activeCharacterId,
            activeWeaponId: context.activeWeaponId,
            entities: context.entities,
            text
          })

          const cached = yield* SynchronizedRef.modify(cache, (entries) => {
            const hit = entries.get(cacheKey)
            return [hit, entries] as const
          })

          if (cached) {
            return cached
          }

          const response = yield* llm.complete({ text, context })
          const interpretations = decodeLiveCandidates(response.candidates, context)

          yield* SynchronizedRef.update(cache, (entries) => new Map([...entries, [cacheKey, interpretations]]))

          return interpretations
        })

      return TranscriptInterpreter.of({ interpret })
    })
  )
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

function extractMessageContent(json: unknown): string | undefined {
  if (
    typeof json !== "object"
    || json === null
    || !("choices" in json)
    || !Array.isArray(json.choices)
  ) {
    return undefined
  }

  const firstChoice = json.choices[0]
  if (
    typeof firstChoice !== "object"
    || firstChoice === null
    || !("message" in firstChoice)
    || typeof firstChoice.message !== "object"
    || firstChoice.message === null
    || !("content" in firstChoice.message)
  ) {
    return undefined
  }

  const content = firstChoice.message.content
  if (typeof content === "string") {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter(isTextContentPart)
      .map((part) => part.text)
      .join("\n")
  }
  return undefined
}

function buildSystemPrompt(context: InterpretationContext): string {
  const entities = context.entities
    .map((entity) => `- ${entity.name} (${entity.type})`)
    .join("\n")

  return [
    "You classify tabletop RPG transcript text into candidate game actions.",
    "Return JSON only with shape:",
    '{"candidates":[{"type":"attack|move|withdraw|defense|none","confidence":0.0,"reasoning":"...","targetName":"optional","attackRoll":10,"distanceMoved":30}]}',
    "Use only the listed entities when naming targets.",
    "Rules:",
    '- "attack" may omit targetName when ambiguous or unknown.',
    '- "move" must include distanceMoved.',
    '- "withdraw" and "defense" do not need extra fields.',
    '- "none" means the text is not an actionable game command.',
    "Current entities:",
    entities
  ].join("\n")
}

function getEnv(name: string): string | undefined {
  const processValue = Reflect.get(globalThis, "process")
  if (
    typeof processValue === "object"
    && processValue !== null
    && "env" in processValue
    && typeof processValue.env === "object"
    && processValue.env !== null
    && name in processValue.env
  ) {
    const value = processValue.env[name]
    return typeof value === "string" && value.length > 0 ? value : undefined
  }
  return undefined
}

function isTextContentPart(value: unknown): value is { readonly type: "text", readonly text: string } {
  return (
    typeof value === "object"
    && value !== null
    && "type" in value
    && value.type === "text"
    && "text" in value
    && typeof value.text === "string"
  )
}

function decodeLiveCandidates(
  candidates: ReadonlyArray<LiveTranscriptLlmCandidate>,
  context: InterpretationContext
): ReadonlyArray<CandidateInterpretation> {
  const actionableCandidates = candidates.filter((candidate) => candidate.type !== "none")
  const interpretations = actionableCandidates.flatMap((candidate) => toCandidateInterpretations(candidate, context))

  return interpretations
}

function toCandidateInterpretations(
  candidate: LiveTranscriptLlmCandidate,
  context: InterpretationContext
): ReadonlyArray<CandidateInterpretation> {
  switch (candidate.type) {
    case "attack": {
      if (!context.activeWeaponId) {
        return []
      }
      const weaponId = context.activeWeaponId

      const attackRoll = candidate.attackRoll === undefined
        ? 10
        : Math.min(20, Math.max(1, candidate.attackRoll))

      if (candidate.targetName) {
        const target = resolveTarget(candidate.targetName, context)
        if (!target) {
          return []
        }

        return [{
          event: AttackPerformed.make({
            attackerId: context.activeCharacterId,
            targetId: target.id,
            weaponId,
            attackRoll
          }),
          confidence: candidate.confidence,
          reasoning: candidate.reasoning
        }]
      }

      return allTargets(context).map((target) => ({
        event: AttackPerformed.make({
          attackerId: context.activeCharacterId,
          targetId: target.id,
          weaponId,
          attackRoll
        }),
        confidence: candidate.confidence,
        reasoning: candidate.reasoning
      }))
    }

    case "move":
      return candidate.distanceMoved === undefined
        ? []
        : [{
            event: MovementPerformed.make({
              entityId: context.activeCharacterId,
              distanceMoved: candidate.distanceMoved,
              isWithdrawal: false,
              isRetreat: false
            }),
            confidence: candidate.confidence,
            reasoning: candidate.reasoning
          }]

    case "withdraw":
      return [{
        event: WithdrawalDeclared.make({
          entityId: context.activeCharacterId
        }),
        confidence: candidate.confidence,
        reasoning: candidate.reasoning
      }]

    case "defense":
      return [{
        event: DefenseStanceTaken.make({
          entityId: context.activeCharacterId
        }),
        confidence: candidate.confidence,
        reasoning: candidate.reasoning
      }]

    case "none":
      return []
  }
}
