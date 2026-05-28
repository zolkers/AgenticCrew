import type { MissionControlSnapshot } from "../types/core";

export type InvokeMissionControl = (
  command: "mission_control_snapshot"
) => Promise<MissionControlSnapshot>;

const fallbackMissionControlSnapshot: MissionControlSnapshot = {
  activeAgentCount: 3,
  activeSessionCount: 1,
  currentCheckpoint: "Design approved",
  currentCostUsd: 0,
  humanGateStatus: "pending",
  model: "gpt-4o",
  provider: "openai"
};

export async function loadMissionControlSnapshot(
  invoke?: InvokeMissionControl
): Promise<MissionControlSnapshot> {
  if (invoke === undefined) {
    return fallbackMissionControlSnapshot;
  }

  return invoke("mission_control_snapshot");
}
