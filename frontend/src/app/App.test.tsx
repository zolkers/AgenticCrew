import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot
} from "../shared/types/core";

const openAiModels = [
  { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
  { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
  { id: "gpt-5", label: "GPT-5", providerId: "openai" }
] as const;

const missionControlSnapshot: MissionControlSnapshot = {
  activeAgentCount: 9,
  activeSessionCount: 5,
  currentCheckpoint: "Injected from invoke",
  currentCostUsd: 4.75,
  humanGateStatus: "open",
  model: "gpt-5",
  provider: "openai"
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

  it("renders the AgenticCrew cockpit as the default screen", async () => {
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/fullstack-app/cockpit");
    expect(screen.getByRole("heading", { name: "Build UI shell" })).toBeInTheDocument();
    expect(screen.getAllByText("fullstack-app").length).toBeGreaterThan(0);
    expect(screen.getByText("Active terminal stream")).toBeInTheDocument();
    expect(screen.getByText("UI architect / active")).toBeInTheDocument();
    expect(screen.getByLabelText("Run status")).toHaveTextContent("engine: langgraph");
    expect(screen.queryByRole("heading", { name: "Skill Sources" })).not.toBeInTheDocument();
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
    expect(screen.getAllByText("playwright-runner").length).toBeGreaterThan(0);
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plugins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open plugin bay" })).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "feature/api-platform" } });
    fireEvent.change(screen.getByLabelText("Mission"), { target: { value: "Build API agents" } });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace/api_-2-platform/cockpit");
    expect(screen.getByRole("heading", { name: "Build API agents" })).toBeInTheDocument();
    expect(screen.getByText("feature/api-platform")).toBeInTheDocument();
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
      expect(screen.getByText("Harness: Release Harness")).toBeInTheDocument();
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
    expect(screen.getByText("UI architect / gpt-5")).toBeInTheDocument();
    expect(screen.getByText("Harness: None")).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));
    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /AgenticCrew/ }));

    expect(screen.getByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skill Sources" }));

    expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mission Control" })).not.toBeInTheDocument();
    expect(screen.getByText("superpowers")).toBeInTheDocument();
    expect(screen.getAllByText("Pending validation").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Skill Sources" })).not.toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Harness Studio" }));

    expect(await screen.findByRole("heading", { name: "Harness Studio" })).toBeInTheDocument();
    expect(screen.getByText("Pi Execution Discipline")).toBeInTheDocument();
    expect(screen.getByText("Execution Discipline")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Harness Studio" }));
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Review Harness" } });
    fireEvent.change(screen.getByLabelText("Base policy"), {
      target: { value: "Require review before merge." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create harness" }));

    expect(await screen.findByText("Review Harness")).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agent Studio" }));

    expect(await screen.findByRole("heading", { name: "Agent Studio" })).toBeInTheDocument();
    expect(screen.getByText("Developer Agent")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Agent Studio" }));
    fireEvent.change(await screen.findByLabelText("Description"), {
      target: { value: "Reviews changes before merge." }
    });
    fireEvent.change(screen.getByLabelText("Skill routes"), {
      target: { value: "agenticcrew://skills/review" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByText("Review Agent")).toBeInTheDocument();
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
    expect(screen.getByText("PR workflow ready")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "feature/manual-branch" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Git context" }));
    await waitFor(() => {
      expect(screen.getAllByText("feature/manual-branch").length).toBeGreaterThan(0);
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

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
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
      activeAgentCount: 1,
      activeSessionCount: 1,
      currentCheckpoint: "Unmounted success",
      currentCostUsd: 1,
      humanGateStatus: "open",
      model: "gpt-5",
      provider: "openai"
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

