import type {
  ExecuteRunCommandRequest,
  RecordRunCommandRequest,
  RecordRunEventRequest,
  RunsSnapshot,
  StartRunRequest
} from "../types/core";

export type RunsCommand =
  | "complete_run"
  | "execute_run_command"
  | "fail_run"
  | "kill_run"
  | "pause_run"
  | "prepare_run"
  | "record_run_command"
  | "record_run_event"
  | "resume_run"
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

export async function pauseRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("pause_run", { runId });
}

export async function resumeRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("resume_run", { runId });
}

export async function killRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("kill_run", { runId });
}

export async function failRun(invoke: InvokeRuns, runId: string): Promise<RunsSnapshot> {
  return invoke("fail_run", { runId });
}

export async function recordRunCommand(
  invoke: InvokeRuns,
  request: RecordRunCommandRequest
): Promise<RunsSnapshot> {
  return invoke("record_run_command", { request });
}

export async function recordRunEvent(
  invoke: InvokeRuns,
  request: RecordRunEventRequest
): Promise<RunsSnapshot> {
  return invoke("record_run_event", { request });
}

export async function executeRunCommand(
  invoke: InvokeRuns,
  request: ExecuteRunCommandRequest
): Promise<RunsSnapshot> {
  return invoke("execute_run_command", { request });
}
