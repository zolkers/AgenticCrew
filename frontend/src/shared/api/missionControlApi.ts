import type { MissionControlSnapshot } from "../types/core";

export type InvokeMissionControl = (
  command: "mission_control_snapshot"
) => Promise<MissionControlSnapshot>;

export async function loadMissionControlSnapshot(
  invoke: InvokeMissionControl
): Promise<MissionControlSnapshot> {
  return invoke("mission_control_snapshot");
}
