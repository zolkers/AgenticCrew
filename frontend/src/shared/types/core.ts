export type HumanGateStatus = "open" | "pending" | "blocked";

export type MissionControlSnapshot = {
  activeAgentCount: number;
  activeSessionCount: number;
  currentCheckpoint: string;
  currentCostUsd: number;
  humanGateStatus: HumanGateStatus;
  model: string;
  provider: string;
};
