/**
 * Dashboard entry point.
 * Bootstraps Effect runtime, computes all snapshots, renders the Ink app.
 *
 * Run: tsx --tsconfig src/dashboard/tsconfig.json src/dashboard/index.tsx
 */
import { Effect } from "effect"
import { render } from "ink"
import React from "react"

import { App } from "./App.js"
import { dashboardLayer } from "./simulation/layers.js"
import { computeAllSnapshots } from "./simulation/runner.js"
import { allObservations } from "./simulation/scenario.js"
import type { Snapshot } from "./types.js"

const labels = allObservations.map((o) => o.label)
const totalSteps = allObservations.length

const doComputeSnapshots = (onDone: (snapshots: ReadonlyArray<Snapshot>) => void): void => {
  Effect.runPromise(
    computeAllSnapshots.pipe(
      Effect.provide(dashboardLayer)
    )
  ).then(onDone, (err) => {
    console.error("Failed to compute snapshots:", err)
  })
}

render(
  React.createElement(App, { computeSnapshots: doComputeSnapshots, labels, totalSteps })
)
