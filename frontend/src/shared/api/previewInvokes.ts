import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot,
  WorkspaceSnapshot
} from "../types/core";
import { cockpitWorkspaces } from "../preview/cockpitData";
import type { InvokeAgentStudio } from "./agentStudioApi";
import type { InvokeHarnessStudio } from "./harnessStudioApi";
import type { InvokeMissionControl } from "./missionControlApi";
import type { InvokeSettings } from "./settingsApi";
import type { InvokeSkillSources } from "./skillSourcesApi";
import type { InvokeWorkspace } from "./workspaceApi";

const previewMissionControlSnapshot: MissionControlSnapshot = {
  activeAgentCount: 0,
  activeSessionCount: 0,
  checkpoints: [],
  costSummary: {
    modelCallCount: 0,
    totalUsd: 0
  },
  currentCheckpoint: "Preview mode",
  currentCostUsd: 0,
  gitSummary: {
    activeBranches: ["codex/cockpit-prototype", "codex/mobile-smoke"],
    workspaceCount: 2
  },
  humanGateStatus: "open",
  model: "local-preview",
  provider: "browser",
  recentEvidence: [],
  sessions: [],
  skillSummary: {
    activeSourceCount: 0,
    discoveredSkillCount: 0,
    sourceCount: 1
  }
};

const previewWorkspaceSnapshot: WorkspaceSnapshot = {
  workspaces: [...cockpitWorkspaces]
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
  activePiExtensionCount: 0,
  activeProfileCount: 1,
  bindings: [],
  piExtensions: [],
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

let currentPreviewHarnessStudioSnapshot = previewHarnessStudioSnapshot;

export function resetPreviewInvokesForTests() {
  currentPreviewHarnessStudioSnapshot = previewHarnessStudioSnapshot;
}

function withEffectiveHarnesses(snapshot: HarnessStudioSnapshot): HarnessStudioSnapshot {
  const activePiExtensions = (snapshot.piExtensions ?? []).filter((extension) => extension.active);
  const piExtensionContent = activePiExtensions
    .flatMap((extension) => extension.modules)
    .filter((module) => module.enabled && module.content.trim().length > 0)
    .map((module) => module.content.trim());

  return {
    ...snapshot,
    activePiExtensionCount: activePiExtensions.length,
    activeProfileCount: snapshot.profiles.filter((profile) => profile.active).length,
    effectiveHarnesses: snapshot.profiles
      .filter((profile) => profile.active)
      .map((profile) => {
        const enabledModules = profile.modules.filter((module) => module.enabled);
        const preview =
          [
            ...enabledModules
              .map((module) => module.content.trim())
              .filter((content) => content.length > 0),
            ...piExtensionContent
          ].join("\n\n") || "No enabled module content";

        return {
          enabledModuleCount: enabledModules.length,
          piExtensionCount: activePiExtensions.length,
          preview,
          profileId: profile.id,
          profileName: profile.name,
          skillRouteCount: profile.skillRoutes.length
        };
      })
  };
}

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
  trainingRuns: [
    {
      agentTemplateId: "developer-pi",
      criticScore: 94,
      datasetId: "preview-release",
      id: "preview-train-release",
      promotedVersion: null,
      status: "completed"
    },
    {
      agentTemplateId: "developer-pi",
      criticScore: 91,
      datasetId: "preview-smoke",
      id: "preview-train-smoke",
      promotedVersion: 1,
      status: "promoted"
    },
    {
      agentTemplateId: "missing-agent",
      criticScore: 90,
      datasetId: "preview-orphan",
      id: "preview-train-orphan",
      promotedVersion: null,
      status: "completed"
    }
  ]
};

const previewSettingsSnapshot: SettingsSnapshot = {
  aiProvider: {
    apiKeyConfigured: false,
    apiKeyLastFour: null,
    availableModels: [
      { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
      { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
      { id: "gpt-5", label: "GPT-5", providerId: "openai" },
      { id: "gpt-5-mini", label: "GPT-5 mini", providerId: "openai" },
      { id: "gpt-5-nano", label: "GPT-5 nano", providerId: "openai" }
    ],
    displayName: "OpenAI",
    modelSyncError: null,
    modelSyncStatus: "never_synced",
    modelsLastSyncedAt: null,
    providerId: "openai",
    selectedModelId: "gpt-5"
  }
};

export const previewMissionControlInvoke: InvokeMissionControl = () =>
  Promise.resolve(previewMissionControlSnapshot);

export const previewWorkspaceInvoke: InvokeWorkspace = (command, args) => {
  if (command === "create_workspace") {
    const request = args?.request as
      | { branch?: string; id?: string; mission?: string; name?: string; path?: string }
      | undefined;
    const id = request?.id ?? "preview-workspace";

    return Promise.resolve({
      workspaces: [
        ...previewWorkspaceSnapshot.workspaces,
        {
          activeAgentId: "director",
          agents: [
            {
              id: "director",
              model: "gpt-5",
              name: "director",
              role: "Workspace director",
              status: "active",
              tools: ["planning", "git", "workspace"]
            }
          ],
          branch: request?.branch ?? "main",
          budgetLimitUsd: 10,
          budgetUsedUsd: 0,
          checkpoints: [
            { label: "Workspace created", state: "done" },
            { label: request?.mission ?? "Start a new agent mission", state: "running" },
            { label: "First run validation", state: "queued" }
          ],
          id,
          logs: [
            `$ agenticcrew attach ${id} --workspace ${request?.path ?? "local"}`,
            `workspace resolved: ${id} / branch ${request?.branch ?? "main"}`,
            `mission: ${request?.mission ?? "Start a new agent mission"}`
          ],
          gitStatus: {
            aheadCount: 0,
            behindCount: 0,
            branch: request?.branch ?? "main",
            hasUntracked: false,
            isDirty: false,
            lastError: null,
            lastRefreshedAt: null,
            remoteBranch: null
          },
          mission: request?.mission ?? "Start a new agent mission",
          name: request?.name ?? "Preview Workspace",
          path: request?.path ?? "local",
          selectedAgentTemplateId: null,
          selectedHarnessProfileId: null,
          skills: ["superpowers:tdd", "git:workspace-context"],
          status: "configured"
        }
      ]
    });
  }

  if (command === "update_workspace_git_context") {
    const request = args?.request as { branch?: string; path?: string; workspaceId?: string } | undefined;

    return Promise.resolve({
      workspaces: previewWorkspaceSnapshot.workspaces.map((workspace) =>
        workspace.id === request?.workspaceId
          ? {
              ...workspace,
              branch: request.branch ?? workspace.branch,
              gitStatus: {
                ...(workspace.gitStatus ?? emptyGitStatus(workspace.branch)),
                branch: request.branch ?? workspace.branch,
                lastError: null
              },
              path: request.path ?? workspace.path
            }
          : workspace
      )
    });
  }

  if (command === "refresh_workspace_git_status") {
    const request = args?.request as { workspaceId?: string } | undefined;

    return Promise.resolve({
      workspaces: previewWorkspaceSnapshot.workspaces.map((workspace) =>
        workspace.id === request?.workspaceId
          ? {
              ...workspace,
              gitStatus: {
                aheadCount: 1,
                behindCount: 0,
                branch: workspace.branch,
                hasUntracked: true,
                isDirty: true,
                lastError: null,
                lastRefreshedAt: "preview",
                remoteBranch: `origin/${workspace.branch}`
              }
            }
          : workspace
      )
    });
  }

  if (command === "update_workspace_loadout") {
    const request = args?.request as
      | { agentTemplateId?: null | string; harnessProfileId?: null | string; workspaceId?: string }
      | undefined;

    return Promise.resolve({
      workspaces: previewWorkspaceSnapshot.workspaces.map((workspace) =>
        workspace.id === request?.workspaceId
          ? {
              ...workspace,
              selectedAgentTemplateId: request.agentTemplateId ?? null,
              selectedHarnessProfileId: request.harnessProfileId ?? null
            }
          : workspace
      )
    });
  }

  return Promise.resolve(previewWorkspaceSnapshot);
};

export const previewHarnessStudioInvoke: InvokeHarnessStudio = (command, args) => {
  if (command === "create_harness_profile") {
    const request = args?.request as
      | {
          active?: boolean;
          basePolicy?: string;
          description?: string;
          id?: string;
          name?: string;
          skillRoutes?: string[];
        }
      | undefined;
    const id = request?.id ?? "preview-local";

    currentPreviewHarnessStudioSnapshot = withEffectiveHarnesses({
      ...currentPreviewHarnessStudioSnapshot,
      profiles: [
        ...currentPreviewHarnessStudioSnapshot.profiles,
        {
          active: request?.active ?? false,
          description: request?.description ?? "Preview local harness",
          id,
          modules: [
            {
              content: request?.basePolicy ?? "Preview base policy",
              enabled: true,
              id: `${id}/base-policy`,
              kind: "base_policy",
              name: "Base Policy",
              source: {
                route: `agenticcrew://harnesses/local/${id}`,
                sourceId: "local",
                trustLevel: "local"
              },
              version: "1"
            }
          ],
          name: request?.name ?? "Preview Local",
          skillRoutes: request?.skillRoutes ?? [],
          version: "1"
        }
      ]
    });

    return Promise.resolve(currentPreviewHarnessStudioSnapshot);
  }

  if (command === "set_harness_profile_active") {
    const request = args?.request as { active?: boolean; profileId?: string } | undefined;
    const profileId = request?.profileId;
    const active = request?.active;
    const profiles = currentPreviewHarnessStudioSnapshot.profiles.map((profile) =>
      profile.id === profileId ? { ...profile, active: active ?? profile.active } : profile
    );

    currentPreviewHarnessStudioSnapshot = withEffectiveHarnesses({
      ...currentPreviewHarnessStudioSnapshot,
      profiles
    });

    return Promise.resolve(currentPreviewHarnessStudioSnapshot);
  }

  if (command === "update_harness_profile") {
    const request = args?.request as
      | { basePolicy: string; description: string; name: string; profileId: string; skillRoutes?: string[] }
      | undefined;
    if (request === undefined) {
      return Promise.resolve(currentPreviewHarnessStudioSnapshot);
    }

    const profiles = currentPreviewHarnessStudioSnapshot.profiles.map((profile) =>
      profile.id === request.profileId
        ? {
            ...profile,
            description: request.description,
            modules: profile.modules.map((module) => ({
              ...module,
              content: request.basePolicy,
              version: incrementStringVersion(module.version)
            })),
            name: request.name,
            skillRoutes: request.skillRoutes ?? profile.skillRoutes,
            version: incrementStringVersion(profile.version)
          }
        : profile
    );

    currentPreviewHarnessStudioSnapshot = withEffectiveHarnesses({
      ...currentPreviewHarnessStudioSnapshot,
      profiles
    });

    return Promise.resolve(currentPreviewHarnessStudioSnapshot);
  }

  if (command === "import_pi_extension") {
    const request = args?.request as
      | {
          agentPersona?: null | string;
          basePolicy?: string;
          behaviorRules?: string[];
          description?: string;
          id?: string;
          name?: string;
          outputStyle?: null | string;
          projectMemory?: null | string;
          safetyRules?: string[];
          toolRules?: string[];
        }
      | undefined;
    const id = request?.id ?? "preview-pi";
    const extension = {
      active: false,
      description: request?.description ?? "Preview PI extension",
      id,
      inspected: true,
      modules: [
        {
          content: request?.basePolicy ?? "Preview PI policy",
          enabled: true,
          id: `${id}/base-policy`,
          kind: "base_policy" as const,
          name: "Base Policy",
          source: {
            route: `agenticcrew://pi/local/${id}`,
            sourceId: id,
            trustLevel: "local" as const
          },
          version: "1"
        }
      ],
      name: request?.name ?? "Preview PI",
      route: `agenticcrew://pi/local/${id}`
    };

    currentPreviewHarnessStudioSnapshot = withEffectiveHarnesses({
      ...currentPreviewHarnessStudioSnapshot,
      piExtensions: [...(currentPreviewHarnessStudioSnapshot.piExtensions ?? []), extension]
    });

    return Promise.resolve(currentPreviewHarnessStudioSnapshot);
  }

  if (command === "set_pi_extension_active") {
    const request = args?.request as { active?: boolean; extensionId?: string } | undefined;
    const piExtensions = (currentPreviewHarnessStudioSnapshot.piExtensions ?? []).map((extension) =>
      extension.id === request?.extensionId
        ? { ...extension, active: request.active ?? extension.active }
        : extension
    );

    currentPreviewHarnessStudioSnapshot = withEffectiveHarnesses({
      ...currentPreviewHarnessStudioSnapshot,
      piExtensions
    });

    return Promise.resolve(currentPreviewHarnessStudioSnapshot);
  }

  return Promise.resolve(currentPreviewHarnessStudioSnapshot);
};

export const previewAgentStudioInvoke: InvokeAgentStudio = (command, args) => {
  if (command === "create_agent_template") {
    const request = args?.request as
      | {
          active?: boolean;
          budgetCents?: number;
          description?: string;
          harnessProfileId?: null | string;
          id?: string;
          modelId?: string;
          name?: string;
          providerId?: string;
          role?: string;
          skillRoutes?: string[];
        }
      | undefined;
    const id = request?.id ?? "preview-agent";

    return Promise.resolve({
      ...previewAgentStudioSnapshot,
      activeTemplateCount: previewAgentStudioSnapshot.activeTemplateCount + (request?.active ? 1 : 0),
      templates: [
        ...previewAgentStudioSnapshot.templates,
        {
          active: request?.active ?? false,
          budgetCents: request?.budgetCents ?? 200,
          description: request?.description ?? "Preview local agent",
          harnessProfileId: request?.harnessProfileId ?? null,
          id,
          modelId: request?.modelId ?? "gpt-5.2",
          name: request?.name ?? "Preview Agent",
          providerId: request?.providerId ?? "openai",
          role: request?.role ?? "developer",
          skillRoutes: request?.skillRoutes ?? [],
          version: 1
        }
      ]
    });
  }

  if (command === "set_agent_template_active") {
    const request = args?.request as { active?: boolean; templateId?: string } | undefined;
    const templateId = request?.templateId;
    const active = request?.active;
    const templates = previewAgentStudioSnapshot.templates.map((template) =>
      template.id === templateId ? { ...template, active: active ?? template.active } : template
    );

    return Promise.resolve({
      ...previewAgentStudioSnapshot,
      activeTemplateCount: templates.filter((template) => template.active).length,
      templates
    });
  }

  if (command === "update_agent_template") {
    const request = args?.request as
      | {
          budgetCents: number;
          description: string;
          harnessProfileId: null | string;
          modelId: string;
          name: string;
          providerId: string;
          role: string;
          skillRoutes: string[];
          templateId: string;
        }
      | undefined;
    if (request === undefined) {
      return Promise.resolve(previewAgentStudioSnapshot);
    }

    const templates = previewAgentStudioSnapshot.templates.map((template) =>
      template.id === request.templateId
        ? {
            ...template,
            budgetCents: request.budgetCents,
            description: request.description,
            harnessProfileId: request.harnessProfileId,
            modelId: request.modelId,
            name: request.name,
            providerId: request.providerId,
            role: request.role,
            skillRoutes: request.skillRoutes,
            version: template.version + 1
          }
        : template
    );

    return Promise.resolve({
      ...previewAgentStudioSnapshot,
      templates
    });
  }

  if (command === "promote_agent_training_run") {
    const request = args?.request as { trainingRunId?: string } | undefined;
    const run = previewAgentStudioSnapshot.trainingRuns.find(
      (trainingRun) => trainingRun.id === request?.trainingRunId
    );
    if (run === undefined || run.status !== "completed") {
      return Promise.resolve(previewAgentStudioSnapshot);
    }

    const templates = previewAgentStudioSnapshot.templates.map((template) =>
      template.id === run.agentTemplateId ? { ...template, version: template.version + 1 } : template
    );
    const promotedTemplate = templates.find((template) => template.id === run.agentTemplateId);
    if (promotedTemplate === undefined) {
      return Promise.resolve(previewAgentStudioSnapshot);
    }

    const trainingRuns = previewAgentStudioSnapshot.trainingRuns.map((trainingRun) =>
      trainingRun.id === request?.trainingRunId
        ? {
            ...trainingRun,
            promotedVersion: promotedTemplate.version,
            status: "promoted" as const
          }
        : trainingRun
    );

    return Promise.resolve({
      ...previewAgentStudioSnapshot,
      templates,
      trainingRuns
    });
  }

  return Promise.resolve(previewAgentStudioSnapshot);
};

function incrementStringVersion(version: string): string {
  return String(Number.parseInt(version, 10) + 1);
}

function emptyGitStatus(branch: string) {
  return {
    aheadCount: 0,
    behindCount: 0,
    branch,
    hasUntracked: false,
    isDirty: false,
    lastError: null,
    lastRefreshedAt: null,
    remoteBranch: null
  };
}

export const previewSkillSourcesInvoke: InvokeSkillSources = (command) => {
  if (command === "skill_sources_snapshot") {
    return Promise.resolve(previewSkillSourcesSnapshot);
  }

  return Promise.resolve(undefined);
};

export const previewSettingsInvoke: InvokeSettings = (command, args) => {
  if (command === "sync_provider_models") {
    return Promise.resolve({
      aiProvider: {
        ...previewSettingsSnapshot.aiProvider,
        modelSyncError: "OpenAI API key is required before syncing models",
        modelSyncStatus: "failed"
      }
    });
  }

  if (command === "update_ai_provider_settings") {
    const request = args?.request as { apiKey?: string | null; selectedModelId?: string } | undefined;
    const apiKey = request?.apiKey?.trim();
    const apiKeyConfigured =
      apiKey === undefined ? previewSettingsSnapshot.aiProvider.apiKeyConfigured : apiKey.length > 0;
    let apiKeyLastFour = previewSettingsSnapshot.aiProvider.apiKeyLastFour;

    if (apiKey !== undefined) {
      apiKeyLastFour = apiKey.length > 0 ? apiKey.slice(-4) : null;
    }

    return Promise.resolve({
      aiProvider: {
        ...previewSettingsSnapshot.aiProvider,
        apiKeyConfigured,
        apiKeyLastFour,
        selectedModelId: request?.selectedModelId ?? previewSettingsSnapshot.aiProvider.selectedModelId
      }
    });
  }

  return Promise.resolve(previewSettingsSnapshot);
};
