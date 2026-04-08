/**
 * TranscriptInterpreter — Effect service that converts natural language
 * transcript segments into candidate domain events.
 *
 * Layers:
 * - mockLayer: local deterministic recognizer, no LLM service boundary.
 * - liveLayer: LLM-backed interpretation via TranscriptLlm.
 *
 * ⚡ Electric field: In the D&D project, candidates are validated against
 * Quint spec guards (hard reject) instead of Hellenvald's soft consistency
 * warnings (burden scoring). The interpreter interface stays the same —
 * only the downstream validation changes.
 */
import { Context, Duration, Effect, Layer, Schema, SynchronizedRef } from "effect"

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

class OpenRouterConfig extends Context.Tag("@game/OpenRouterConfig")<
  OpenRouterConfig,
  {
    readonly apiKey: string
    readonly model: string
  }
>() {
  static readonly fromEnvLayer = Layer.effect(
    OpenRouterConfig,
    Effect.sync(() => {
      const apiKey = getEnv("OPENROUTER_API_KEY")
      if (!apiKey) {
        return new TranscriptInterpretationError({
          message: "OPENROUTER_API_KEY is not set"
        })
      }

      return OpenRouterConfig.of({
        apiKey,
        model: getEnv("OPENROUTER_MODEL") ?? "openai/gpt-4.1-mini"
      })
    }).pipe(
      Effect.flatMap((value) =>
        value instanceof TranscriptInterpretationError
          ? Effect.fail(value)
          : Effect.succeed(value)
      )
    )
  )
}

class TranscriptLlmTransport extends Context.Tag("@game/TranscriptLlmTransport")<
  TranscriptLlmTransport,
  {
    readonly complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  }
>() {
  static readonly openRouterLayer = Layer.effect(
    TranscriptLlmTransport,
    Effect.gen(function*() {
      const config = yield* OpenRouterConfig

      return TranscriptLlmTransport.of({
        complete: (request) =>
          Effect.tryPromise({
            try: async () => {
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${config.apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: config.model,
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
    })
  )

  static readonly testLayer = (
    complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  ) => Layer.succeed(TranscriptLlmTransport, { complete })

  static readonly demoLayer = (options?: { readonly latencyMs?: number }) => {
    const latencyMs = options?.latencyMs ?? 0

    return Layer.succeed(TranscriptLlmTransport, {
      complete: (request) =>
        Effect.gen(function*() {
          if (latencyMs > 0) {
            yield* Effect.sleep(Duration.millis(latencyMs))
          }

          return classifyTranscriptText(request.text)
        })
    })
  }
}

export class TranscriptLlm extends Context.Tag("@game/TranscriptLlm")<
  TranscriptLlm,
  {
    readonly complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  }
>() {
  static readonly liveLayer = makeCachedTranscriptLlmLayer(
    TranscriptLlm,
    TranscriptLlmTransport.openRouterLayer.pipe(
      Layer.provide(OpenRouterConfig.fromEnvLayer)
    )
  )

  static readonly testLayer = (
    complete: (
      request: TranscriptLlmRequest
    ) => Effect.Effect<LiveTranscriptLlmResponse, TranscriptInterpretationError>
  ) => makeCachedTranscriptLlmLayer(TranscriptLlm, TranscriptLlmTransport.testLayer(complete))

  static readonly demoLayer = (options?: { readonly latencyMs?: number }) =>
    makeCachedTranscriptLlmLayer(TranscriptLlm, TranscriptLlmTransport.demoLayer(options))
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
        const text = segments.map((s) => s.text).join(" ").trim()
        return decodeLiveCandidates(classifyTranscriptText(text).candidates, context)
      })
  })

  static readonly liveLayer = Layer.effect(
    TranscriptInterpreter,
    Effect.gen(function*() {
      const llm = yield* TranscriptLlm

      const interpret = (
        segments: ReadonlyArray<TranscriptSegment>,
        context: InterpretationContext
      ) =>
        Effect.gen(function*() {
          const text = segments.map((segment) => segment.text).join(" ").trim()
          const response = yield* llm.complete({ text, context })
          return decodeLiveCandidates(response.candidates, context)
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
    "{\"candidates\":[{\"type\":\"attack|move|withdraw|defense|none\",\"confidence\":0.0,\"reasoning\":\"...\",\"targetName\":\"optional\",\"attackRoll\":10,\"distanceMoved\":30}]}",
    "Use only the listed entities when naming targets.",
    "Rules:",
    "- \"attack\" may omit targetName when ambiguous or unknown.",
    "- \"move\" must include distanceMoved.",
    "- \"withdraw\" and \"defense\" do not need extra fields.",
    "- \"none\" means the text is not an actionable game command.",
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

function isTextContentPart(value: unknown): value is { readonly type: "text"; readonly text: string } {
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

      const targets = allTargets(context)
      if (targets.length === 1) {
        return [{
          event: AttackPerformed.make({
            attackerId: context.activeCharacterId,
            targetId: targets[0].id,
            weaponId,
            attackRoll
          }),
          confidence: Math.max(candidate.confidence, 0.85),
          reasoning: `Attack with only one target available: ${targets[0].name}`
        }]
      }

      return targets.map((target) => ({
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

function classifyTranscriptText(text: string): LiveTranscriptLlmResponse {
  const normalizedText = text.toLowerCase()

  const attackNamed = normalizedText.match(/(?:i )?(?:attack|swing at|hit|strike)\s+(?:the\s+)?(\w+)/)
  if (attackNamed && attackNamed[1] !== "that" && attackNamed[1] !== "thats") {
    const rollMatch = normalizedText.match(/(?:rolled?\s+(?:a\s+)?)?(\d+)/)
    const attackRoll = rollMatch ? Math.min(20, Math.max(1, parseInt(rollMatch[1], 10))) : 10

    return {
      candidates: [{
        type: "attack",
        confidence: 0.92,
        reasoning: `Direct attack declaration against ${capitalize(attackNamed[1])}`,
        targetName: attackNamed[1],
        attackRoll
      }]
    }
  }

  const attackGeneric = normalizedText.match(/(?:i )?(?:attack|swing|hit|strike)(?:\s|$)/)
  if (attackGeneric) {
    return {
      candidates: [{
        type: "attack",
        confidence: 0.55,
        reasoning: "Attack declared without a target"
      }]
    }
  }

  const moveMatch = normalizedText.match(/(?:i )?(?:move|walk|run|advance)\s+(\d+)\s*(?:feet|ft)?/)
  if (moveMatch) {
    return {
      candidates: [{
        type: "move",
        confidence: 0.88,
        reasoning: "Movement amount is explicit",
        distanceMoved: parseInt(moveMatch[1], 10)
      }]
    }
  }

  if (normalizedText.match(/(?:i )?withdraw/)) {
    return {
      candidates: [{
        type: "withdraw",
        confidence: 0.85,
        reasoning: "Withdrawal declared"
      }]
    }
  }

  if (normalizedText.match(/(?:i )?(?:defend|take (?:a )?defensive stance|go defensive|total defense)/)) {
    return {
      candidates: [{
        type: "defense",
        confidence: 0.9,
        reasoning: "Defensive stance"
      }]
    }
  }

  return {
    candidates: [{
      type: "none",
      confidence: 1,
      reasoning: "No actionable game command detected"
    }]
  }
}

function capitalize(value: string): string {
  return value.length > 0
    ? value[0].toUpperCase() + value.slice(1)
    : value
}

function makeCachedTranscriptLlmLayer(
  tag: typeof TranscriptLlm,
  transportLayer: Layer.Layer<TranscriptLlmTransport, TranscriptInterpretationError, never>
): Layer.Layer<TranscriptLlm, TranscriptInterpretationError, never> {
  return Layer.effect(
    tag,
    Effect.gen(function*() {
      const transport = yield* TranscriptLlmTransport
      const cache = yield* SynchronizedRef.make(new Map<string, LiveTranscriptLlmResponse>())

      return tag.of({
        complete: (request) =>
          Effect.gen(function*() {
            const cacheKey = JSON.stringify({
              activeCharacterId: request.context.activeCharacterId,
              activeWeaponId: request.context.activeWeaponId,
              entities: request.context.entities,
              text: request.text
            })

            const cached = yield* SynchronizedRef.modify(cache, (entries) => {
              const hit = entries.get(cacheKey)
              return [hit, entries] as const
            })

            if (cached) {
              return cached
            }

            const response = yield* transport.complete(request)

            yield* SynchronizedRef.update(cache, (entries) => new Map([...entries, [cacheKey, response]]))

            return response
          })
      })
    })
  ).pipe(Layer.provide(transportLayer))
}
