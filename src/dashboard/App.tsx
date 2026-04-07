import { Box, Text, useApp, useInput } from "ink"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { CandidatePanel } from "./components/CandidatePanel.js"
import { EntityPanel } from "./components/EntityPanel.js"
import { ObservationTimeline } from "./components/ObservationTimeline.js"
import { StatusBar } from "./components/StatusBar.js"
import type { DashboardState, Snapshot } from "./types.js"

interface AppProps {
  readonly computeSnapshots: (onDone: (snapshots: ReadonlyArray<Snapshot>) => void) => void
  readonly labels: ReadonlyArray<string>
  readonly totalSteps: number
}

const emptyEntities: Snapshot["entities"] = new Map()

export const App: React.FC<AppProps> = ({ computeSnapshots, labels, totalSteps }) => {
  const { exit } = useApp()
  const [state, setState] = useState<DashboardState>({
    currentSnapshotIndex: 0,
    snapshots: [],
    autoMode: false,
    loading: true
  })
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    computeSnapshots((snapshots) => {
      setState((prev) => ({ ...prev, snapshots, loading: false }))
    })
  }, [computeSnapshots])

  const navigate = useCallback((delta: number) => {
    setState((prev) => {
      if (prev.snapshots.length === 0) return prev
      const next = Math.max(0, Math.min(prev.snapshots.length - 1, prev.currentSnapshotIndex + delta))
      return { ...prev, currentSnapshotIndex: next }
    })
  }, [])

  const toggleAuto = useCallback(() => {
    setState((prev) => {
      const newAuto = !prev.autoMode
      if (!newAuto && autoTimerRef.current) {
        clearInterval(autoTimerRef.current)
        autoTimerRef.current = null
      }
      if (newAuto) {
        autoTimerRef.current = setInterval(() => {
          setState((s) => {
            if (s.currentSnapshotIndex >= s.snapshots.length - 1) {
              if (autoTimerRef.current) clearInterval(autoTimerRef.current)
              autoTimerRef.current = null
              return { ...s, autoMode: false }
            }
            return { ...s, currentSnapshotIndex: s.currentSnapshotIndex + 1 }
          })
        }, 400)
      }
      return { ...prev, autoMode: newAuto }
    })
  }, [])

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [])

  useInput((input, key) => {
    if (input === "q" || input === "Q" || key.escape) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
      exit()
      return
    }
    if (state.loading) return

    if (input === " " || key.rightArrow) {
      navigate(1)
    } else if (key.leftArrow) {
      navigate(-1)
    } else if (input === "a" || input === "A") {
      toggleAuto()
    }
  })

  if (state.loading) {
    return (
      <Box flexDirection="column">
        <Box borderStyle="double" borderColor="cyan" paddingX={1} justifyContent="center">
          <Text bold color="cyan">PROBABILISTIC EVENT SOURCING</Text>
        </Box>
        <Text>Computing scenario snapshots...</Text>
      </Box>
    )
  }

  const currentSnapshot = state.snapshots[state.currentSnapshotIndex]
  const currentStep = currentSnapshot?.step
  const entities = currentSnapshot?.entities ?? emptyEntities
  const allSteps = state.snapshots.map((s) => s.step)

  return (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="cyan" paddingX={1} justifyContent="center">
        <Text bold color="cyan">PROBABILISTIC EVENT SOURCING</Text>
      </Box>

      <Box flexGrow={1} minHeight={16}>
        <ObservationTimeline
          steps={allSteps}
          currentStepIndex={state.currentSnapshotIndex}
          totalSteps={totalSteps}
          labels={labels}
        />
        <Box marginLeft={1}>
          <CandidatePanel step={currentStep} phase="scored" />
        </Box>
      </Box>

      <EntityPanel entities={entities} />

      <StatusBar
        autoMode={state.autoMode}
        phase={currentStep?.fastForward ? "fast-forward" : "scored"}
        currentStep={state.currentSnapshotIndex}
        totalSteps={state.snapshots.length}
      />
    </Box>
  )
}
