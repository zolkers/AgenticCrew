import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  RunsSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot
} from "../shared/types/core";

const openAiModels = [
  { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
  { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
  { id: "gpt-5", label: "GPT-5", providerId: "openai" }
] as const;

const missionControlSnapshot: MissionControlSnapshot = {
  activeModel: {
    modelId: "gpt-5",
    providerId: "openai"
  },
  activeProvider: {
    displayName: "OpenAI",
    providerId: "openai"
  },
  activeWorkspace: null,
  activeAgentCount: 9,
  activeSessionCount: 5,
  checkpoints: [
    {
      label: "Injected checkpoint item",
      ownerAgent: "maya",
      sessionId: "session-1",
      status: "pending"
    }
  ],
  costSummary: {
    modelCallCount: 3,
    tokenLimit: 1_000_000,
    totalTokens: 42_500,
    totalUsd: 4.75
  },
  currentCheckpoint: "Injected from invoke",
  currentCostUsd: 4.75,
  gitSummary: {
    activeBranches: ["dev"],
    workspaceCount: 2
  },
  humanGateStatus: "open",
  recentEvidence: [
    {
      checkpointId: "checkpoint-1",
      command: "npm run test",
      createdAt: "2026-05-29T12:00:00Z",
      evidenceId: "ev-1",
      exitCode: 0
    }
  ],
  sessions: [
    {
      branch: "dev",
      checkpointCount: 2,
      id: "session-1",
      pendingCheckpointCount: 1,
      status: "running",
      title: "Injected session"
    }
  ],
  skillSummary: {
    activeSourceCount: 1,
    discoveredSkillCount: 4,
    sourceCount: 2
  }
};

const skillSourcesSnapshot: SkillSourcesSnapshot = {
  activeSourceCount: 0,
  sources: [
    {
      active: false,
      id: "superpowers",
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

const harnessStudioSnapshot: HarnessStudioSnapshot = {
  activeProfileCount: 1,
  bindings: [],
  profiles: [
    {
      active: true,
      description: "Built-in execution policy",
      id: "pi-execution-discipline",
      modules: [
        {
          content: "Validate before final claims.",
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

const agentStudioSnapshot: AgentStudioSnapshot = {
  activeTemplateCount: 1,
  templates: [
    {
      active: true,
      budgetCents: 200,
      description: "General implementation agent",
      harnessProfileId: "pi-execution-discipline",
      id: "developer-pi",
      modelId: "gpt-5.4",
      name: "Developer Agent",
      providerId: "openai",
      role: "developer",
      skillRoutes: ["agenticcrew://skills/superpowers/subagent-driven-development"],
      version: 1
    }
  ],
  trainingRuns: []
};

const settingsSnapshot: SettingsSnapshot = {
  aiProvider: {
    apiKeyConfigured: true,
    apiKeyLastFour: "1234",
    availableModels: [...openAiModels],
    displayName: "OpenAI",
    providerId: "openai",
    selectedModelId: "gpt-5"
  }
};

const settingsInvoke = () => Promise.resolve(settingsSnapshot);

const runsSnapshot: RunsSnapshot = {
  activeRunId: null,
  events: [],
  runs: []
};

function createDeferredSnapshot<T>() {
  let resolveSnapshot = (snapshot: T): void => {
    throw new Error(`Deferred snapshot resolve was used before assignment: ${JSON.stringify(snapshot)}`);
  };
  let rejectSnapshot = (error: Error): void => {
    throw new Error(`Deferred snapshot reject was used before assignment: ${error.message}`);
  };
  const promise = new Promise<T>((resolve, reject) => {
    resolveSnapshot = resolve;
    rejectSnapshot = reject;
  });

  return { promise, rejectSnapshot, resolveSnapshot };
}

async function openDefaultWorkspace() {
  fireEvent.click(await screen.findByRole("button", { name: /Fullstack App/ }));
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the AgenticCrew Workbench as the default screen", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(screen.getByText("Loading Mission Control")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Choose a workspace" })).toBeInTheDocument();
    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/fullstack-app/cockpit");
    expect(screen.getByRole("heading", { name: "Build UI shell" })).toBeInTheDocument();
    expect(screen.getAllByText("fullstack-app").length).toBeGreaterThan(0);
    expect(screen.getByText("Run event log")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Developer Agent" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Start run" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start run" })).toBeEnabled();
    expect(screen.getByLabelText("Run status")).not.toHaveTextContent("engine: langgraph");
    expect(screen.getByLabelText("Run status")).not.toHaveTextContent("cache: 74% hit");
    expect(screen.queryByRole("heading", { name: "Skill Sources" })).not.toBeInTheDocument();
  });

  it("changes the active workspace branch from the topbar and shows token usage", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(screen.getByLabelText("Token usage")).toHaveTextContent("42.5K / 1M");

    fireEvent.click(screen.getByRole("button", { name: "Active branch" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "codex/mobile-smoke" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Active branch" })).toHaveTextContent("codex/mobile-smoke");
    });
  });

  it("starts a durable run from the workbench composer", async () => {
    const runsInvoke = (command: "runs_snapshot" | "start_run", args?: Record<string, unknown>) => {
      if (command === "start_run") {
        const request = args?.request as { id: string; task: string; workspaceId: string };

        return Promise.resolve({
          activeRunId: request.id,
          events: [
            {
              createdAt: "preview",
              id: `${request.id}-event-1`,
              level: "info" as const,
              message: `Run queued for workspace '${request.workspaceId}'`,
              runId: request.id
            }
          ],
          runs: [
            {
              agentTemplateId: "developer-pi",
              baseBranch: "dev",
              createdAt: "preview",
              harnessProfileId: "pi-execution-discipline",
              id: request.id,
              modelId: "gpt-5",
              providerId: "openai",
              runBranch: `codex/run-${request.id}`,
              startedAt: null,
              status: "queued" as const,
              stoppedAt: null,
              task: request.task,
              updatedAt: "preview",
              workspaceId: request.workspaceId,
              worktreePath: `C:\\repo\\.agenticcrew\\runs\\${request.id}`
            }
          ]
        });
      }

      return Promise.resolve(runsSnapshot);
    };

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        runsInvoke={runsInvoke}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.change(screen.getByLabelText("Task"), {
      target: { value: "Prioritize layout regressions before handoff." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Start run" }));

    expect(await screen.findByText("Prioritize layout regressions before handoff.")).toBeInTheDocument();
    expect(screen.getByText(/Run queued for workspace/u)).toBeInTheDocument();
  });

  it("switches workspace and updates visible agent context", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "Build UI shell" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mobile QA/ }));

    expect(screen.getByRole("heading", { name: "Stabilize device smoke" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/mobile-qa/cockpit");
    expect(screen.getByText("Policy: Pi Execution Discipline")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Build UI shell" })).not.toBeInTheDocument();
  });

  it("shows a plugins entry point in the cockpit sidebar", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profiles & Policies" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Runs" })).toBeInTheDocument();
  });

  it("creates a workspace from the launchpad and opens it", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Choose a workspace" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Workspace name"), { target: { value: "API_{2-Platform" } });
    fireEvent.change(screen.getByLabelText("Workspace path"), { target: { value: "D:\\work\\api-platform" } });
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "dev" } });
    fireEvent.change(screen.getByLabelText("Mission"), { target: { value: "Build API agents" } });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/api_-2-platform/cockpit");
    expect(screen.getByRole("heading", { name: "Build API agents" })).toBeInTheDocument();
    expect(screen.getAllByText("dev").length).toBeGreaterThan(0);
  });

  it("keeps navigation out of the topbar and exposes it in a workspace rail", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();

    expect(await screen.findByRole("navigation", { name: "Workspace sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).not.toHaveTextContent("Mission Control");
  });

  it("selects the active agent and harness loadout from saved templates", async () => {
    const multiHarnessSnapshot: HarnessStudioSnapshot = {
      ...harnessStudioSnapshot,
      activeProfileCount: 2,
      profiles: [
        ...harnessStudioSnapshot.profiles,
        {
          ...harnessStudioSnapshot.profiles[0],
          id: "release-harness",
          name: "Release Harness"
        }
      ]
    };
    const multiAgentSnapshot: AgentStudioSnapshot = {
      ...agentStudioSnapshot,
      activeTemplateCount: 2,
      templates: [
        ...agentStudioSnapshot.templates,
        {
          ...agentStudioSnapshot.templates[0],
          harnessProfileId: "release-harness",
          id: "release-agent",
          modelId: "gpt-5.1",
          name: "Release Agent",
          role: "release"
        }
      ]
    };

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(multiAgentSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(multiHarnessSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.change(await screen.findByLabelText("Agent template"), { target: { value: "release-agent" } });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Release Agent" })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Harness profile"), { target: { value: "release-harness" } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Release Agent" })).toBeInTheDocument();
      expect(screen.getByText("release / gpt-5.1")).toBeInTheDocument();
      expect(screen.getByText("Policy: Release Harness")).toBeInTheDocument();
    });
  });

  it("falls back to cockpit agent context when no saved loadout items exist", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve({ activeTemplateCount: 0, templates: [], trainingRuns: [] })}
        harnessStudioInvoke={() => Promise.resolve({ activeProfileCount: 0, bindings: [], profiles: [] })}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();

    expect(await screen.findByRole("heading", { name: "Build UI shell" })).toBeInTheDocument();
    expect(screen.getByText("developer / model pending")).toBeInTheDocument();
    expect(screen.getByText("Policy: None")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Start run" })).toBeInTheDocument();
  });

  it("offers inactive saved templates when none are active", async () => {
    render(
      <App
        agentStudioInvoke={() =>
          Promise.resolve({
            activeTemplateCount: 0,
            templates: agentStudioSnapshot.templates.map((template) => ({ ...template, active: false })),
            trainingRuns: []
          })
        }
        harnessStudioInvoke={() =>
          Promise.resolve({
            ...harnessStudioSnapshot,
            activeProfileCount: 0,
            profiles: harnessStudioSnapshot.profiles.map((profile) => ({ ...profile, active: false }))
          })
        }
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();

    expect(await screen.findByLabelText("Agent template")).toHaveValue("developer-pi");
    expect(screen.getByLabelText("Harness profile")).toHaveValue("pi-execution-discipline");
  });

  it("returns to the cockpit from the product mark", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));
    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /AgenticCrew/ }));

    expect(screen.getByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    expect(screen.queryByText("Injected from invoke")).not.toBeInTheDocument();
  });

  it("renders injected mission control data", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("switches between Mission Control and Skill Sources", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skill Sources" }));

    expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mission Control" })).not.toBeInTheDocument();
    expect(screen.getAllByText("superpowers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs review").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Skill Sources" })).not.toBeInTheDocument();
  });

  it("keeps Skill Sources in sync after registering a source", async () => {
    let currentSkillSources: SkillSourcesSnapshot = { activeSourceCount: 0, sources: [] };
    const skillSourcesInvoke = (command: string) => {
      if (command === "register_github_skill_source") {
        currentSkillSources = skillSourcesSnapshot;
      }

      return Promise.resolve(currentSkillSources);
    };

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={skillSourcesInvoke}
      />
    );

    await openDefaultWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Skill Sources" }));
    expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getAllByText("superpowers").length).toBeGreaterThan(0);
    });
  });

  it("opens Harness Studio with the PI execution profile", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Execution Policies" }));

    expect(await screen.findByRole("heading", { name: "Execution Policies" })).toBeInTheDocument();
    expect(screen.getAllByText("Pi Execution Discipline").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Effective harness" })).toBeInTheDocument();
    expect(screen.getAllByText("Execution Discipline").length).toBeGreaterThan(0);
  });

  it("keeps Harness Studio in sync after creating a local harness", async () => {
    const updatedHarnessSnapshot: HarnessStudioSnapshot = {
      activeProfileCount: 2,
      bindings: [],
      profiles: [
        ...harnessStudioSnapshot.profiles,
        {
          active: true,
          description: "Local execution profile for this workspace.",
          id: "review-harness",
          modules: [
            {
              content: "Require review before merge.",
              enabled: true,
              id: "review-harness/base-policy",
              kind: "base_policy",
              name: "Base Policy",
              source: {
                route: "agenticcrew://harnesses/local/review-harness",
                sourceId: "local",
                trustLevel: "local"
              },
              version: "1"
            }
          ],
          name: "Review Harness",
          skillRoutes: [],
          version: "1"
        }
      ]
    };
    const interactiveHarnessInvoke = (command: string) =>
      Promise.resolve(command === "harness_studio_snapshot" ? harnessStudioSnapshot : updatedHarnessSnapshot);

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={interactiveHarnessInvoke}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Execution Policies" }));
    fireEvent.click(await screen.findByRole("button", { name: "New harness" }));
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Review Harness" } });
    fireEvent.change(screen.getByLabelText("Base policy"), {
      target: { value: "Require review before merge." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create harness" }));

    await waitFor(() => {
      expect(screen.getAllByText("Review Harness").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });

  it("opens Agent Studio with the saved developer agent", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agent Profiles" }));

    expect(await screen.findByRole("heading", { name: "Agent Profiles" })).toBeInTheDocument();
    expect(screen.getAllByText("Developer Agent").length).toBeGreaterThan(0);
    expect(screen.getByText("pi-execution-discipline")).toBeInTheDocument();
  });

  it("keeps Agent Studio in sync after creating a local agent", async () => {
    const updatedAgentSnapshot: AgentStudioSnapshot = {
      activeTemplateCount: 2,
      templates: [
        ...agentStudioSnapshot.templates,
        {
          active: true,
          budgetCents: 200,
          description: "Reviews changes before merge.",
          harnessProfileId: "pi-execution-discipline",
          id: "review-agent",
          modelId: "gpt-5.2",
          name: "Review Agent",
          providerId: "openai",
          role: "reviewer",
          skillRoutes: ["agenticcrew://skills/review"],
          version: 1
        }
      ],
      trainingRuns: []
    };
    const interactiveAgentInvoke = (command: string) =>
      Promise.resolve(command === "agent_studio_snapshot" ? agentStudioSnapshot : updatedAgentSnapshot);

    render(
      <App
        agentStudioInvoke={interactiveAgentInvoke}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Agent Profiles" }));
    fireEvent.click(await screen.findByRole("button", { name: "New agent" }));
    fireEvent.change(await screen.findByLabelText("Prompt"), {
      target: { value: "Reviews changes before merge." }
    });
    fireEvent.change(screen.getByLabelText("Skill routes"), {
      target: { value: "agenticcrew://skills/review" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    expect((await screen.findAllByText("Review Agent")).length).toBeGreaterThan(0);
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });

  it("opens Git and Settings through stable workspace routes", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "Git" }));
    expect(await screen.findByRole("heading", { name: "Git Panel" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/fullstack-app/git");
    expect(screen.getByText("Working tree clean")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Working tree dirty")).toBeInTheDocument();
    expect(screen.getAllByText("1 ahead / 0 behind").length).toBeGreaterThan(0);
    expect(screen.queryByText("C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText("feat(cockpit): expose branch picker and token usage")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "codex/mobile-smoke" } });
    fireEvent.click(screen.getByRole("button", { name: "Save branch" }));
    await waitFor(() => {
      expect(screen.getAllByText("codex/mobile-smoke").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/fullstack-app/settings");
    expect(screen.getByText("ChatGPT provider selected")).toBeInTheDocument();
  });

  it("keeps provider settings in sync after saving from Settings", async () => {
    const updatedSettingsSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "9999",
        availableModels: [...openAiModels],
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5.2"
      }
    };
    const interactiveSettingsInvoke = (command: string) =>
      Promise.resolve(command === "settings_snapshot" ? settingsSnapshot : updatedSettingsSnapshot);

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={interactiveSettingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(await screen.findByLabelText("Model"), { target: { value: "gpt-5.2" } });
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "sk-proj-secret9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Configured ending in 9999")).toBeInTheDocument();
    expect(screen.getAllByText("gpt-5.2").length).toBeGreaterThan(0);
  });

  it("can return to the workspace launchpad from the topbar", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    await openDefaultWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Choose workspace" }));

    expect(await screen.findByRole("heading", { name: "Choose a workspace" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspaces");
  });

  it("hydrates a known workspace route on initial render", async () => {
    window.history.replaceState(null, "", "/workspace/mobile-qa/git");

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Git Panel" })).toBeInTheDocument();
    expect(screen.getAllByText("codex/mobile-smoke").length).toBeGreaterThan(0);
  });

  it("falls back to the cockpit for unknown workspace route segments", async () => {
    window.history.replaceState(null, "", "/workspace/fullstack-app/unknown");

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "AgenticCrew Workbench" })).toBeInTheDocument();
  });

  it("falls back to launchpad for unknown workspace ids", async () => {
    window.history.replaceState(null, "", "/workspace/missing/cockpit");

    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Choose a workspace" })).toBeInTheDocument();
  });

  it("renders an error state when the desktop command fails", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.reject(new Error("command failed"))}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Mission Control unavailable");
  });

  it("ignores loaded data after unmount", async () => {
    const pendingMissionControlSnapshot = createDeferredSnapshot<MissionControlSnapshot>();
    const pendingSkillSourcesSnapshot = createDeferredSnapshot<SkillSourcesSnapshot>();
    const { unmount } = render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => pendingMissionControlSnapshot.promise}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => pendingSkillSourcesSnapshot.promise}
      />
    );

    unmount();
    pendingMissionControlSnapshot.resolveSnapshot({
      activeModel: {
        modelId: "gpt-5",
        providerId: "openai"
      },
      activeProvider: {
        displayName: "OpenAI",
        providerId: "openai"
      },
      activeWorkspace: null,
      activeAgentCount: 1,
      activeSessionCount: 1,
      checkpoints: [],
      costSummary: {
        modelCallCount: 0,
        tokenLimit: 1_000_000,
        totalTokens: 0,
        totalUsd: 1
      },
      currentCheckpoint: "Unmounted success",
      currentCostUsd: 1,
      gitSummary: {
        activeBranches: [],
        workspaceCount: 0
      },
      humanGateStatus: "open",
      recentEvidence: [],
      sessions: [],
      skillSummary: {
        activeSourceCount: 0,
        discoveredSkillCount: 0,
        sourceCount: 0
      }
    });
    pendingSkillSourcesSnapshot.resolveSnapshot(skillSourcesSnapshot);
    await Promise.all([pendingMissionControlSnapshot.promise, pendingSkillSourcesSnapshot.promise]);

    expect(screen.queryByText("Unmounted success")).not.toBeInTheDocument();
  });

  it("ignores load failures after unmount", async () => {
    const pendingMissionControlSnapshot = createDeferredSnapshot<MissionControlSnapshot>();
    const pendingSkillSourcesSnapshot = createDeferredSnapshot<SkillSourcesSnapshot>();
    const { unmount } = render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => pendingMissionControlSnapshot.promise}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={() => pendingSkillSourcesSnapshot.promise}
      />
    );

    unmount();
    pendingMissionControlSnapshot.rejectSnapshot(new Error("unmounted failure"));
    pendingSkillSourcesSnapshot.resolveSnapshot(skillSourcesSnapshot);

    await expect(pendingMissionControlSnapshot.promise).rejects.toThrow("unmounted failure");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

});


