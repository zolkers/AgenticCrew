import type { MissionControlSnapshot, RecordModelCallEstimateRequest } from "../types/core";

export type MissionControlCommand = "mission_control_snapshot" | "record_model_call_estimate";

export type InvokeMissionControl = (
  command: MissionControlCommand,
  args?: Record<string, unknown>
) => Promise<MissionControlSnapshot>;

export async function loadMissionControlSnapshot(
  invoke: InvokeMissionControl
): Promise<MissionControlSnapshot> {
  return invoke("mission_control_snapshot");
}

export async function recordModelCallEstimate(
  invoke: InvokeMissionControl,
  request: RecordModelCallEstimateRequest
): Promise<MissionControlSnapshot> {
  return invoke("record_model_call_estimate", { request });
}
