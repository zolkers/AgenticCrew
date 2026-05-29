import type { MissionControlSnapshot, SkillSourcesSnapshot } from "../types/core";
import type { InvokeMissionControl } from "./missionControlApi";
import type { InvokeSkillSources } from "./skillSourcesApi";

const previewMissionControlSnapshot: MissionControlSnapshot = {
  activeAgentCount: 0,
  activeSessionCount: 0,
  currentCheckpoint: "Preview mode",
  currentCostUsd: 0,
  humanGateStatus: "open",
  model: "local-preview",
  provider: "browser"
};

const previewSkillSourcesSnapshot: SkillSourcesSnapshot = {
  activeSourceCount: 0,
  sources: [
    {
      active: false,
      discoveredSkills: [],
      id: "preview-superpowers",
      kind: "git_hub",
      lastSyncError: null,
      lastSyncStatus: "never_synced",
      lastSyncedCommit: null,
      localCachePath: null,
      permissionGate: {
        approved: false,
        policy: {
          commands: [],
          docker: false,
          fileSystem: [],
          git: false,
          network: []
        }
      },
      repositoryUrl: "https://github.com/obra/superpowers",
      selectedRef: "main",
      status: "pending_validation",
      trustLevel: "external",
      validationErrors: []
    }
  ]
};

export const previewMissionControlInvoke: InvokeMissionControl = () =>
  Promise.resolve(previewMissionControlSnapshot);

export const previewSkillSourcesInvoke: InvokeSkillSources = (command) => {
  if (command === "skill_sources_snapshot") {
    return Promise.resolve(previewSkillSourcesSnapshot);
  }

  return Promise.resolve(undefined);
};
