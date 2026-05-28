export type MissionControlSnapshot = {
  activeAgents: number;
  activeSessions: number;
  currentCheckpoint: string;
  currentCostUsd: string;
  humanGateStatus: string;
  model: string;
  provider: string;
};
