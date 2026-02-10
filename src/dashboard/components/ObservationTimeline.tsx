import { Box, Text } from "ink"
import React from "react"

import type { ObservationStep } from "../types.js"

interface TimelineProps {
  readonly steps: ReadonlyArray<ObservationStep>
  readonly currentStepIndex: number
  readonly totalSteps: number
  readonly labels: ReadonlyArray<string>
}

/** Collapse consecutive fast-forward steps into one display line */
interface DisplayEntry {
  readonly label: string
  readonly startIndex: number
  readonly endIndex: number
  readonly isCurrent: boolean
  readonly isCompleted: boolean
  readonly isFastForward: boolean
}

const buildDisplayEntries = (
  labels: ReadonlyArray<string>,
  steps: ReadonlyArray<ObservationStep>,
  currentStepIndex: number,
  totalSteps: number
): Array<DisplayEntry> => {
  const entries: Array<DisplayEntry> = []

  // Group consecutive fast-forward steps
  let i = 0
  while (i < totalSteps) {
    const step = steps[i]
    const isFf = step?.fastForward ?? (i < 11) // first 11 are char creation

    if (isFf) {
      // Find end of consecutive fast-forward block
      let end = i
      while (end + 1 < totalSteps && (steps[end + 1]?.fastForward ?? (end + 1 < 11))) {
        end++
      }
      const isCurrent = currentStepIndex >= i && currentStepIndex <= end
      const isCompleted = end < currentStepIndex
      entries.push({
        label: "Character Creation (11 steps)",
        startIndex: i,
        endIndex: end,
        isCurrent,
        isCompleted,
        isFastForward: true
      })
      i = end + 1
    } else {
      const isCurrent = currentStepIndex === i
      const isCompleted = i < currentStepIndex
      entries.push({
        label: labels[i] ?? `Step ${i + 1}`,
        startIndex: i,
        endIndex: i,
        isCurrent,
        isCompleted,
        isFastForward: false
      })
      i++
    }
  }

  return entries
}

export const ObservationTimeline: React.FC<TimelineProps> = ({
  steps,
  currentStepIndex,
  totalSteps,
  labels
}) => {
  const entries = buildDisplayEntries(labels, steps, currentStepIndex, totalSteps)

  return (
    <Box flexDirection="column" width={28}>
      <Text bold underline>Observations</Text>
      <Text> </Text>
      {entries.map((entry, idx) => {
        const prefix = entry.isCurrent ? " > " : "   "
        const color = entry.isCurrent ? "yellow" : entry.isCompleted ? "green" : "gray"
        const suffix = entry.isCurrent ? " <" : ""
        const check = entry.isCompleted ? " [done]" : ""
        return (
          <Text key={idx} color={color}>
            {prefix}{idx + 1}. {entry.label}{suffix}{check}
          </Text>
        )
      })}
    </Box>
  )
}
