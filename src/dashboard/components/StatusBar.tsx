import { Box, Text } from "ink"
import React from "react"

interface StatusBarProps {
  readonly autoMode: boolean
  readonly phase: string
  readonly currentStep: number
  readonly totalSteps: number
}

export const StatusBar: React.FC<StatusBarProps> = ({ autoMode, phase, currentStep, totalSteps }) => (
  <Box borderStyle="single" borderColor="gray" paddingX={1}>
    <Text>
      <Text color="cyan">[Space/Right]</Text> Next{"  "}
      <Text color="cyan">[Left]</Text> Prev{"  "}
      <Text color="cyan">[A]</Text> Auto{autoMode ? " (ON)" : ""}{"  "}
      <Text color="cyan">[Q]</Text> Quit{"  "}
      <Text dimColor>Step {currentStep + 1}/{totalSteps} | {phase}</Text>
    </Text>
  </Box>
)
