import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot
} from "../types/core";
import type { InvokeAgentStudio } from "./agentStudioApi";
import type { InvokeHarnessStudio } from "./harnessStudioApi";
import type { InvokeMissionControl } from "./missionControlApi";
import type { InvokeSettings } from "./settingsApi";
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

const previewSettingsSnapshot: SettingsSnapshot = {
  aiProvider: {
    apiKeyConfigured: false,
    apiKeyLastFour: null,
    displayName: "OpenAI",
    providerId: "openai",
    selectedModelId: "gpt-5"
  }
};

export const previewMissionControlInvoke: InvokeMissionControl = () =>
  Promise.resolve(previewMissionControlSnapshot);

export const previewHarnessStudioInvoke: InvokeHarnessStudio = (command, args) => {
  if (command === "create_harness_profile") {
    const request = args?.request as
      | { active?: boolean; basePolicy?: string; description?: string; id?: string; name?: string }
      | undefined;
    const id = request?.id ?? "preview-local";

    return Promise.resolve({
      ...previewHarnessStudioSnapshot,
      activeProfileCount: previewHarnessStudioSnapshot.activeProfileCount + (request?.active ? 1 : 0),
      profiles: [
        ...previewHarnessStudioSnapshot.profiles,
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
          skillRoutes: [],
          version: "1"
        }
      ]
    });
  }

  if (command === "set_harness_profile_active") {
    const request = args?.request as { active?: boolean; profileId?: string } | undefined;
    const profileId = request?.profileId;
    const active = request?.active;
    const profiles = previewHarnessStudioSnapshot.profiles.map((profile) =>
      profile.id === profileId ? { ...profile, active: active ?? profile.active } : profile
    );

    return Promise.resolve({
      ...previewHarnessStudioSnapshot,
      activeProfileCount: profiles.filter((profile) => profile.active).length,
      profiles
    });
  }

  if (command === "update_harness_profile") {
    const request = args?.request as
      | { basePolicy: string; description: string; name: string; profileId: string }
      | undefined;
    if (request === undefined) {
      return Promise.resolve(previewHarnessStudioSnapshot);
    }

    const profiles = previewHarnessStudioSnapshot.profiles.map((profile) =>
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
            version: incrementStringVersion(profile.version)
          }
        : profile
    );

    return Promise.resolve({
      ...previewHarnessStudioSnapshot,
      profiles
    });
  }

  return Promise.resolve(previewHarnessStudioSnapshot);
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

  return Promise.resolve(previewAgentStudioSnapshot);
};

function incrementStringVersion(version: string): string {
  return String(Number.parseInt(version, 10) + 1);
}

export const previewSkillSourcesInvoke: InvokeSkillSources = (command) => {
  if (command === "skill_sources_snapshot") {
    return Promise.resolve(previewSkillSourcesSnapshot);
  }

  return Promise.resolve(undefined);
};

export const previewSettingsInvoke: InvokeSettings = (command, args) => {
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
