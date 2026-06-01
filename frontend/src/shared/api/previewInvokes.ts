import type {
  AgentStudioSnapshot,
  CommitPreviewResponse,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  RunsSnapshot,
  SettingsSnapshot,
  SkillSource,
  SkillSourcesSnapshot,
  WorkspaceSnapshot
} from "../types/core";
import { cockpitWorkspaces } from "../preview/cockpitData";
import type { InvokeAgentStudio } from "./agentStudioApi";
import type { InvokeHarnessStudio } from "./harnessStudioApi";
import type { InvokeMissionControl } from "./missionControlApi";
import type { InvokeRuns } from "./runsApi";
import type { InvokeSettings } from "./settingsApi";
import type { InvokeSkillSources, SkillSourcesCommand } from "./skillSourcesApi";
import type { InvokeCommitPreview, InvokeWorkspace } from "./workspaceApi";

const previewMissionControlSnapshot: MissionControlSnapshot = {
  activeModel: {
    modelId: "local-preview",
    providerId: "browser"
  },
  activeProvider: {
    displayName: "Browser preview",
    providerId: "browser"
  },
  activeWorkspace: {
    branch: "codex/cockpit-prototype",
    id: "fullstack-app",
    mission: "Build UI shell",
    name: "Fullstack App",
    path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
    status: "running"
  },
  activeAgentCount: 0,
  activeSessionCount: 0,
  checkpoints: [],
  costSummary: {
    modelCallCount: 0,
    tokenLimit: 1_000_000,
    totalTokens: 0,
    totalUsd: 0
  },
  currentCheckpoint: "Preview mode",
  currentCostUsd: 0,
  gitSummary: {
    activeBranches: ["codex/cockpit-prototype", "codex/mobile-smoke"],
    workspaceCount: 2
  },
  humanGateStatus: "open",
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

const previewRuntimeAllowedPrograms = ["cargo", "git", "node", "npm", "rustc"];

const previewRunsSnapshot: RunsSnapshot = {
  activeRunId: null,
  commands: [],
  events: [],
  runs: [],
  runtimePolicy: {
    allowedPrograms: previewRuntimeAllowedPrograms
  }
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

let currentPreviewSkillSourcesSnapshot = previewSkillSourcesSnapshot;

let currentPreviewHarnessStudioSnapshot = previewHarnessStudioSnapshot;

let currentPreviewRunsSnapshot = previewRunsSnapshot;
const previewAllowedRuntimePrograms = new Set(previewRuntimeAllowedPrograms);

type PreviewStartRunRequest = {
  agentTemplateId?: null | string;
  harnessProfileId?: null | string;
  id?: string;
  modelId?: null | string;
  participants?: Array<{
    agentTemplateId?: null | string;
    executionMode: "read_only" | "write";
    harnessProfileId?: null | string;
    id: string;
    modelId?: null | string;
    providerId?: null | string;
    reasoningEffort?: "high" | "low" | "medium";
    role: "documentation" | "implementation" | "orchestration" | "qa" | "review" | "security";
    skillRoutes: string[];
  }>;
  providerId?: null | string;
  reasoningEffort?: "high" | "low" | "medium";
  skillRoutes?: string[];
  task?: string;
  workspaceId?: string;
};

type PreviewCreateAgentTemplateRequest = {
  active?: boolean;
  budgetCents?: number;
  description?: string;
  harnessProfileId?: null | string;
  id?: string;
  modelId?: string;
  name?: string;
  providerId?: string;
  reasoningEffort?: "high" | "low" | "medium";
  role?: string;
  skillRoutes?: string[];
};

export function resetPreviewInvokesForTests() {
  currentPreviewHarnessStudioSnapshot = previewHarnessStudioSnapshot;
  currentPreviewRunsSnapshot = previewRunsSnapshot;
  currentPreviewSkillSourcesSnapshot = previewSkillSourcesSnapshot;
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
      reasoningEffort: "medium",
      role: "developer",
      skillRoutes: [
        "agenticcrew://skills/superpowers/subagent-driven-development",
        "agenticcrew://skills/browser/browser"
      ],
      version: 1
    }
  ],
  evaluationRuns: [
    {
      agentTemplateId: "developer-pi",
      artifactPath: "preview/evaluations/developer-pi.json",
      baselineVersion: 1,
      candidateVersion: 2,
      estimatedCostCents: 42,
      id: "preview-eval-release",
      regressionCount: 0,
      score: 96,
      status: "passed",
      suiteId: "release-regression"
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

const previewProviderOptions = [
  {
    defaultModelId: "gpt-5",
    displayName: "OpenAI",
    models: [
      { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
      { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
      { id: "gpt-5", label: "GPT-5", providerId: "openai" },
      { id: "gpt-5-mini", label: "GPT-5 mini", providerId: "openai" },
      { id: "gpt-5-nano", label: "GPT-5 nano", providerId: "openai" }
    ],
    providerId: "openai"
  },
  {
    defaultModelId: "gemini-3-pro",
    displayName: "Gemini",
    models: [
      { id: "gemini-3-pro", label: "Gemini 3 Pro", providerId: "gemini" },
      { id: "gemini-3-flash", label: "Gemini 3 Flash", providerId: "gemini" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", providerId: "gemini" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", providerId: "gemini" }
    ],
    providerId: "gemini"
  }
];

const previewSettingsSnapshot: SettingsSnapshot = {
  aiProvider: {
    apiKeyConfigured: false,
    apiKeyLastFour: null,
    availableModels: previewProviderOptions[0].models,
    displayName: "OpenAI",
    modelSyncError: null,
    modelSyncStatus: "never_synced",
    modelsLastSyncedAt: null,
    providerOptions: previewProviderOptions,
    providerId: "openai",
    reasoningEffort: "medium",
    selectedModelId: "gpt-5"
  }
};

export const previewMissionControlInvoke: InvokeMissionControl = (command, args) => {
  if (command === "record_model_call_estimate") {
    const request = args?.request as
      | {
          estimatedCostUsd?: number;
          cachedTokens?: number;
          inputTokens?: number;
          model?: string;
          outputTokens?: number;
          provider?: string;
        }
      | undefined;
    const totalTokens = (request?.inputTokens ?? 0) + (request?.outputTokens ?? 0);

    return Promise.resolve({
      ...previewMissionControlSnapshot,
      activeModel: {
        modelId: request?.model ?? previewMissionControlSnapshot.activeModel.modelId,
        providerId: request?.provider ?? previewMissionControlSnapshot.activeModel.providerId
      },
      activeProvider: {
        displayName: request?.provider ?? previewMissionControlSnapshot.activeProvider.displayName,
        providerId: request?.provider ?? previewMissionControlSnapshot.activeProvider.providerId
      },
      costSummary: {
        modelCallCount: previewMissionControlSnapshot.costSummary.modelCallCount + 1,
        tokenLimit: previewMissionControlSnapshot.costSummary.tokenLimit,
        totalTokens: previewMissionControlSnapshot.costSummary.totalTokens + totalTokens,
        totalUsd:
          previewMissionControlSnapshot.costSummary.totalUsd + (request?.estimatedCostUsd ?? 0)
      },
      currentCostUsd:
        previewMissionControlSnapshot.currentCostUsd + (request?.estimatedCostUsd ?? 0)
    });
  }

  return Promise.resolve(previewMissionControlSnapshot);
};

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
          gitHistory: [
            {
              author: "Codex",
              branch: request?.branch ?? "main",
              hash: "preview",
              message: `workspace: create ${id}`,
              relativeTime: "Just now"
            }
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

export const previewCommitPreviewInvoke: InvokeCommitPreview = (_command, args) => {
  const request = args?.request as { commitHash?: string; workspaceId?: string } | undefined;
  const workspace = previewWorkspaceSnapshot.workspaces.find(
    (candidate) => candidate.id === request?.workspaceId
  );
  const commit = workspace?.gitHistory?.find((entry) => entry.hash === request?.commitHash);
  const commitHash = request?.commitHash ?? commit?.hash ?? "preview";
  const subject = commit?.message ?? "preview: generated browser commit";
  const response: CommitPreviewResponse = {
    commitHash,
    files: [
      {
        additions: 42,
        category: "source",
        deletions: 9,
        diffLines: [
          { content: "@@ browser preview", kind: "hunk" },
          { content: "+ render backend commit preview", kind: "addition" },
          { content: "- static history row", kind: "deletion" },
          { content: "+ wire selected commit data", kind: "addition" }
        ],
        path: "frontend/src/features/git/GitPanel.tsx",
        status: "modified"
      },
      {
        additions: 18,
        category: "test",
        deletions: 2,
        diffLines: [
          { content: "@@ tests", kind: "hunk" },
          { content: "+ loads commit preview through the API", kind: "addition" },
          { content: "- leaves history inert", kind: "deletion" }
        ],
        path: "frontend/src/features/git/GitPanel.test.tsx",
        status: "modified"
      },
      {
        additions: 7,
        category: "docs",
        deletions: 1,
        diffLines: [
          { content: "@@ docs", kind: "hunk" },
          { content: "+ document backend-backed Git preview", kind: "addition" }
        ],
        path: "docs/roadmap.md",
        status: "modified"
      },
      {
        additions: 4,
        category: "config",
        deletions: 0,
        diffLines: [
          { content: "@@ config", kind: "hunk" },
          { content: "+ expose commit_preview command", kind: "addition" }
        ],
        path: "package.json",
        status: "modified"
      }
    ],
    metadata: {
      authoredAt: commit?.relativeTime ?? "preview",
      authorEmail: "preview@agenticcrew.local",
      authorName: commit?.author ?? "Browser Preview",
      body: "",
      hash: commitHash,
      shortHash: commitHash.slice(0, 7),
      subject
    },
    workspaceId: request?.workspaceId ?? workspace?.id ?? "preview-workspace"
  };

  return Promise.resolve(response);
};

export const previewRunsInvoke: InvokeRuns = (command, args) => {
  if (command === "start_run") {
    const request = args?.request as PreviewStartRunRequest | undefined;
    const workspace = previewWorkspaceSnapshot.workspaces.find(
      (candidate) => candidate.id === request?.workspaceId
    );
    const runId = request?.id ?? `preview-run-${String(currentPreviewRunsSnapshot.runs.length + 1)}`;
    const createdAt = "preview";
    const run = {
      agentTemplateId: request?.agentTemplateId ?? null,
      baseBranch: workspace?.branch ?? "main",
      createdAt,
      harnessProfileId: request?.harnessProfileId ?? null,
      id: runId,
      modelId: request?.modelId ?? null,
      participants: (request?.participants?.length ?? 0) > 0
        ? (request?.participants ?? []).map((participant) => ({
          ...participant,
          reasoningEffort: participant.reasoningEffort ?? request?.reasoningEffort ?? "medium",
          status: "queued" as const
        }))
        : [
          {
            agentTemplateId: request?.agentTemplateId ?? null,
            executionMode: "write" as const,
            harnessProfileId: request?.harnessProfileId ?? null,
            id: "developer",
            modelId: request?.modelId ?? null,
            providerId: request?.providerId ?? null,
            reasoningEffort: request?.reasoningEffort ?? "medium",
            role: "implementation" as const,
            skillRoutes: request?.skillRoutes ?? [],
            status: "queued" as const
          }
        ],
      providerId: request?.providerId ?? null,
      reasoningEffort: request?.reasoningEffort ?? "medium",
      runBranch: `codex/run-${runId}`,
      skillRoutes: request?.skillRoutes ?? [],
      startedAt: null,
      status: "queued" as const,
      stoppedAt: null,
      task: request?.task?.trim() ?? "Preview run",
      updatedAt: createdAt,
      workspaceId: request?.workspaceId ?? "fullstack-app",
      manifestPath: `${workspace?.path ?? "local"}\\.agenticcrew\\runs\\${runId}\\run-manifest.json`,
      worktreePath: `${workspace?.path ?? "local"}\\.agenticcrew\\runs\\${runId}`
    };

    currentPreviewRunsSnapshot = {
      activeRunId: runId,
      commands: currentPreviewRunsSnapshot.commands,
      events: [
        ...currentPreviewRunsSnapshot.events,
        {
          createdAt,
          id: `${runId}-event-1`,
          level: "info",
          message: `Run queued for workspace '${run.workspaceId}'`,
          runId
        }
      ],
      runs: [...currentPreviewRunsSnapshot.runs, run],
      runtimePolicy: currentPreviewRunsSnapshot.runtimePolicy
    };
  }

  if (
    command === "prepare_run" ||
    command === "start_prepared_run" ||
    command === "complete_run" ||
    command === "fail_run"
  ) {
    const request = args as { runId?: string } | undefined;
    const runId = request?.runId;
    const nextStatusByCommand = {
      complete_run: "completed",
      fail_run: "failed",
      prepare_run: "preparing",
      start_prepared_run: "running"
    } as const;
    const nextStatus = nextStatusByCommand[command];
    const updatedAt = "preview";

    currentPreviewRunsSnapshot = {
      activeRunId: runId ?? currentPreviewRunsSnapshot.activeRunId,
      commands: currentPreviewRunsSnapshot.commands,
      events: [
        ...currentPreviewRunsSnapshot.events,
        ...(runId === undefined
          ? []
          : [
              {
                createdAt: updatedAt,
                id: `${runId}-event-${String(currentPreviewRunsSnapshot.events.length + 1)}`,
                level: "info" as const,
                message: `Run ${nextStatus}`,
                runId
              }
            ])
      ],
      runs: currentPreviewRunsSnapshot.runs.map((run) =>
        run.id === runId
          ? {
              ...run,
              participants: run.participants.map((participant) => ({
                ...participant,
                status: nextStatus
              })),
              startedAt: command === "start_prepared_run" ? updatedAt : run.startedAt,
              status: nextStatus,
              stoppedAt: command === "complete_run" || command === "fail_run" ? updatedAt : run.stoppedAt,
              updatedAt
            }
          : run
      ),
      runtimePolicy: currentPreviewRunsSnapshot.runtimePolicy
    };
  }

  if (command === "execute_run_command") {
    const request = args?.request as
      | {
          args?: string[];
          cwd?: null | string;
          participantId?: string;
          program?: string;
          runId?: string;
        }
      | undefined;
    const program = request?.program ?? "node";
    const commandText = [program, ...(request?.args ?? [])].join(" ");
    const runId = request?.runId ?? currentPreviewRunsSnapshot.activeRunId ?? "preview-run";
    const blocked = !previewAllowedRuntimePrograms.has(program.replace(/\.[^.]+$/u, ""));

    currentPreviewRunsSnapshot = appendPreviewRunCommand({
      command: commandText,
      cwd: request?.cwd ?? "preview",
      exitCode: blocked ? 126 : 0,
      participantId: request?.participantId ?? "developer",
      runId,
      stderr: blocked ? `blocked by runtime command policy: '${program}' is not allowed` : "",
      stdout: blocked ? "" : "runtime check passed"
    });
  }

  if (command === "record_run_command") {
    const request = args?.request as
      | {
          command?: string;
          cwd?: string;
          exitCode?: number;
          participantId?: string;
          runId?: string;
          stderr?: string;
          stdout?: string;
        }
      | undefined;
    currentPreviewRunsSnapshot = appendPreviewRunCommand({
      command: request?.command ?? "agenticcrew runtime check",
      cwd: request?.cwd ?? "preview",
      exitCode: request?.exitCode ?? 0,
      participantId: request?.participantId ?? "developer",
      runId: request?.runId ?? currentPreviewRunsSnapshot.activeRunId ?? "preview-run",
      stderr: request?.stderr ?? "",
      stdout: request?.stdout ?? ""
    });
  }

  return Promise.resolve(currentPreviewRunsSnapshot);
};

function appendPreviewRunCommand(request: {
  command: string;
  cwd: string;
  exitCode: number;
  participantId: string;
  runId: string;
  stderr: string;
  stdout: string;
}): RunsSnapshot {
  const commandRecord = {
    command: request.command,
    createdAt: "preview",
    cwd: request.cwd,
    exitCode: request.exitCode,
    id: `${request.runId}-command-${String(currentPreviewRunsSnapshot.commands.length + 1)}`,
    participantId: request.participantId,
    runId: request.runId,
    status: request.exitCode === 0 ? "succeeded" as const : "failed" as const,
    stderr: request.stderr,
    stdout: request.stdout
  };

  return {
    ...currentPreviewRunsSnapshot,
    activeRunId: request.runId,
    commands: [...currentPreviewRunsSnapshot.commands, commandRecord],
    events: [
      ...currentPreviewRunsSnapshot.events,
      {
        createdAt: "preview",
        id: `${request.runId}-event-${String(currentPreviewRunsSnapshot.events.length + 1)}`,
        level: "info",
        message: `Command '${request.command}' exited ${String(request.exitCode)}`,
        participantId: commandRecord.participantId,
        runId: request.runId
      }
    ]
  };
}

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
    const request = args?.request as PreviewCreateAgentTemplateRequest | undefined;
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
          reasoningEffort: request?.reasoningEffort ?? "medium",
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
          reasoningEffort?: "high" | "low" | "medium";
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
            reasoningEffort: request.reasoningEffort ?? template.reasoningEffort,
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

export const previewSkillSourcesInvoke: InvokeSkillSources = (command, args) => {
  if (command === "skill_sources_snapshot") {
    return Promise.resolve(currentPreviewSkillSourcesSnapshot);
  }

  previewSkillSourceActions[command]?.(args);

  return Promise.resolve(undefined);
};

const previewSkillSourceActions: Partial<Record<SkillSourcesCommand, (args: Parameters<InvokeSkillSources>[1]) => void>> = {
  activate_skill_source: (args) => {
    activatePreviewSkillSource(args && "sourceId" in args ? args.sourceId : "");
  },
  approve_skill_source_permissions: (args) => {
    approvePreviewSkillSource(
      args && "sourceId" in args ? args.sourceId : "",
      args && "policy" in args ? args.policy : undefined
    );
  },
  inspect_cached_skill_source: (args) => {
    syncPreviewSkillSource(args && "sourceId" in args ? args.sourceId : "");
  },
  register_github_skill_source: (args) => {
    registerPreviewSkillSource(args && "request" in args ? args.request : undefined);
  },
  sync_github_skill_source: (args) => {
    syncPreviewSkillSource(args && "sourceId" in args ? args.sourceId : "");
  }
};

function registerPreviewSkillSource(request: { id: string; repositoryUrl: string; selectedRef: string } | undefined) {
  currentPreviewSkillSourcesSnapshot = {
    ...currentPreviewSkillSourcesSnapshot,
    sources: [
      ...currentPreviewSkillSourcesSnapshot.sources,
      {
        active: false,
        discoveredSkills: [],
        id: request?.id ?? "preview-source",
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
        repositoryUrl: request?.repositoryUrl ?? "https://github.com/preview/skills",
        selectedRef: request?.selectedRef ?? "main",
        status: "pending_validation",
        trustLevel: "external",
        validationErrors: []
      }
    ]
  };
}

function syncPreviewSkillSource(sourceId: string) {
  currentPreviewSkillSourcesSnapshot = updatePreviewSkillSources((source) =>
    source.id === sourceId
      ? {
          ...source,
          discoveredSkills: [
            {
              description: "Preview synced skill",
              id: `${source.id}/planning`,
              name: "planning",
              relativePath: "skills/planning/SKILL.md",
              route: `agenticcrew://skills/${source.id}/planning`
            }
          ],
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: "preview",
          localCachePath: `preview/skill-sources/${source.id}`,
          status: "validated",
          validationErrors: []
        }
      : source
  );
}

function approvePreviewSkillSource(sourceId: string, policy: SkillSource["permissionGate"]["policy"] | undefined) {
  currentPreviewSkillSourcesSnapshot = updatePreviewSkillSources((source) =>
    source.id === sourceId
      ? {
          ...source,
          permissionGate: {
            approved: true,
            policy: policy ?? source.permissionGate.policy
          }
        }
      : source
  );
}

function activatePreviewSkillSource(sourceId: string) {
  currentPreviewSkillSourcesSnapshot = updatePreviewSkillSources((source) =>
    source.id === sourceId ? { ...source, active: true } : source
  );
}

function updatePreviewSkillSources(update: (source: SkillSource) => SkillSource): SkillSourcesSnapshot {
  const sources = currentPreviewSkillSourcesSnapshot.sources.map(update);

  return {
    activeSourceCount: sources.filter((source) => source.active).length,
    sources
  };
}

export const previewSettingsInvoke: InvokeSettings = (command, args) => {
  if (command === "sync_provider_models") {
    const request = args?.request as { apiKey?: string | null; providerId?: string } | undefined;
    const apiKey = request?.apiKey?.trim();
    const provider = providerOption(request?.providerId ?? previewSettingsSnapshot.aiProvider.providerId);
    if (provider.providerId === "gemini") {
      return Promise.resolve({
        aiProvider: {
          ...previewSettingsSnapshot.aiProvider,
          availableModels: provider.models,
          displayName: provider.displayName,
          modelSyncError: null,
          modelSyncStatus: "synced",
          modelsLastSyncedAt: "preview",
          providerId: provider.providerId,
          selectedModelId: provider.defaultModelId
        }
      });
    }

    if (apiKey !== undefined && apiKey.length > 0) {
      return Promise.resolve({
        aiProvider: {
          ...previewSettingsSnapshot.aiProvider,
          apiKeyConfigured: true,
          apiKeyLastFour: apiKey.slice(-4),
          availableModels: [
            { id: "gpt-preview-live", label: "gpt-preview-live", providerId: "openai" },
            ...(previewSettingsSnapshot.aiProvider.availableModels ?? [])
          ],
          displayName: provider.displayName,
          modelSyncError: null,
          modelSyncStatus: "synced",
          modelsLastSyncedAt: "preview",
          providerId: provider.providerId,
          selectedModelId: "gpt-preview-live"
        }
      });
    }

    return Promise.resolve({
      aiProvider: {
        ...previewSettingsSnapshot.aiProvider,
        modelSyncError: "OpenAI API key is required before syncing models",
        modelSyncStatus: "failed"
      }
    });
  }

  if (command === "update_ai_provider_settings") {
    const request = args?.request as
      | {
          apiKey?: string | null;
          providerId?: string;
          reasoningEffort?: "high" | "low" | "medium";
          selectedModelId?: string;
        }
      | undefined;
    const apiKey = request?.apiKey?.trim();
    const provider = providerOption(request?.providerId ?? previewSettingsSnapshot.aiProvider.providerId);
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
        availableModels: provider.models,
        displayName: provider.displayName,
        providerId: provider.providerId,
        reasoningEffort: request?.reasoningEffort ?? previewSettingsSnapshot.aiProvider.reasoningEffort,
        selectedModelId: request?.selectedModelId ?? previewSettingsSnapshot.aiProvider.selectedModelId
      }
    });
  }

  return Promise.resolve(previewSettingsSnapshot);
};

function providerOption(providerId: string) {
  return previewProviderOptions.find((provider) => provider.providerId === providerId) ?? previewProviderOptions[0];
}
