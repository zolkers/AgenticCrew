import type { RunsSnapshot, StartRunRequest } from "../types/core";

export type RunsCommand =
  | "complete_run"
  | "fail_run"
  | "prepare_run"
  | "runs_snapshot"
  | "start_prepared_run"
  | "start_run";

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

export async function prepareRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("prepare_run", { runId });
}

export async function startPreparedRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("start_prepared_run", { runId });
}

export async function completeRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("complete_run", { runId });
}

export async function failRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("fail_run", { runId });
}
