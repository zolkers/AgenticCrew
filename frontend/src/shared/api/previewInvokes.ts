import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  SkillSourcesSnapshot
} from "../types/core";
import type { InvokeAgentStudio } from "./agentStudioApi";
import type { InvokeHarnessStudio } from "./harnessStudioApi";
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

const previewHarnessStudioSnapshot: HarnessStudioSnapshot = {
  activeProfileCount: 1,
  bindings: [],
  profiles: [
    {
      active: true,
      description: "Built-in execution policy for targeted inspection, precise edits, root-cause fixes, and validation.",
      id: "pi-execution-discipline",
      modules: [
        {
          content:
            "Use targeted inspection before broad reads. Prefer precise edits. Validate before final claims.",
          enabled: true,
          id: "pi-execution-discipline/base-policy",
          kind: "base_policy",
          name: "Execution Discipline",
          source: {
            route: "agenticcrew://harnesses/builtin-pi/pi-execution-discipline",
            sourceId: "builtin-pi",
            trustLevel: "built_in"
          },
          version: "1"
        }
      ],
      name: "Pi Execution Discipline",
      skillRoutes: [],
      version: "1"
    }
  ]
};

const previewAgentStudioSnapshot: AgentStudioSnapshot = {
  activeTemplateCount: 1,
  templates: [
    {
      active: true,
      budgetCents: 200,
      description: "General implementation agent bound to the built-in Pi execution discipline harness.",
      harnessProfileId: "pi-execution-discipline",
      id: "developer-pi",
      modelId: "gpt-5.4",
      name: "Developer Agent",
      providerId: "openai",
      role: "developer",
      skillRoutes: [
        "agenticcrew://skills/superpowers/subagent-driven-development",
        "agenticcrew://skills/browser/browser"
      ],
      version: 1
    }
  ],
  trainingRuns: []
};

export const previewMissionControlInvoke: InvokeMissionControl = () =>
  Promise.resolve(previewMissionControlSnapshot);

export const previewHarnessStudioInvoke: InvokeHarnessStudio = () =>
  Promise.resolve(previewHarnessStudioSnapshot);

export const previewAgentStudioInvoke: InvokeAgentStudio = () =>
  Promise.resolve(previewAgentStudioSnapshot);

export const previewSkillSourcesInvoke: InvokeSkillSources = (command) => {
  if (command === "skill_sources_snapshot") {
    return Promise.resolve(previewSkillSourcesSnapshot);
  }

  return Promise.resolve(undefined);
};
