import type { RunsSnapshot, StartRunRequest } from "../types/core";

export type RunsCommand = "runs_snapshot" | "start_run";

export type InvokeRuns = (
  command: RunsCommand,
  args?: Record<string, unknown>
) => Promise<RunsSnapshot>;

export async function loadRunsSnapshot(invoke: InvokeRuns): Promise<RunsSnapshot> {
  return invoke("runs_snapshot");
}

export async function startRun(
  invoke: InvokeRuns,
  request: StartRunRequest
): Promise<RunsSnapshot> {
  return invoke("start_run", { request });
}
