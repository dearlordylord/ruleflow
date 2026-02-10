import { Chunk } from "effect"
import { Box, Text } from "ink"
import React from "react"

import type { ObservationStep } from "../types.js"

interface CandidatePanelProps {
  readonly step: ObservationStep | undefined
  readonly phase: string
}

const formatEvent = (event: { readonly _tag: string; [key: string]: unknown }): string => {
  switch (event._tag) {
    case "AttackPerformed":
      return `AttackPerformed roll=${event.attackRoll}`
    case "CurrencyTransferred":
      return `CurrencyTransferred silver=${event.silver}`
    case "CreatureDiscovered":
      return `CreatureDiscovered "${event.name}"`
    default:
      return event._tag
  }
}

export const CandidatePanel: React.FC<CandidatePanelProps> = ({ step, phase }) => {
  if (!step) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text bold underline>Candidates</Text>
        <Text dimColor>No observation selected</Text>
      </Box>
    )
  }

  if (step.fastForward) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text bold underline>Candidates for: {step.label}</Text>
        <Text dimColor>Single candidate (fast-forward)</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold underline>Candidates for: {step.label}</Text>
      <Text> </Text>
      {step.candidates.map((candidate, idx) => {
        const isWinner = idx === step.winnerIndex && (phase === "scored" || phase === "applied")
        const warningCount = Chunk.size(candidate.warnings)
        const warningLines = Chunk.toReadonlyArray(candidate.warnings)

        return (
          <Box key={idx} flexDirection="column" marginBottom={1}>
            <Text>
              {isWinner ? <Text color="green"> &gt; </Text> : "   "}
              <Text color={isWinner ? "green" : "white"} bold={isWinner}>
                [{idx}] {formatEvent(candidate.event as any)}
              </Text>
              {"    "}
              <Text color="cyan">conf: {candidate.confidence.toFixed(2)}</Text>
            </Text>

            {warningCount > 0 ? (
              warningLines.map((w, wi) => (
                <Text key={wi} color="yellow">
                  {"       "} ! {w.problem} (sev: {w.severity.toFixed(2)})
                </Text>
              ))
            ) : (
              <Text dimColor>{"       "} 0 warnings</Text>
            )}

            <Text>
              {"       "}SCORE: burden={candidate.score.burden.toFixed(2)} conf={candidate.score.confidence.toFixed(2)}
              {isWinner ? <Text color="green" bold> WINNER</Text> : ""}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
