import { invoke } from "@tauri-apps/api/core";
import type { MissionControlSnapshot } from "../types/core";
import type { InvokeMissionControl } from "./missionControlApi";

export const tauriMissionControlInvoke: InvokeMissionControl = (command) =>
  invoke<MissionControlSnapshot>(command);
