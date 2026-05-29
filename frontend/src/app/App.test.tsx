import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type { AgentStudioSnapshot, HarnessStudioSnapshot, MissionControlSnapshot, SkillSourcesSnapshot } from "../shared/types/core";

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
      discoveredSkills: [],
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

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the AgenticCrew cockpit as the default screen", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(screen.getByText("Loading Mission Control")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
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
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Build UI shell" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mobile QA/ }));

    expect(screen.getByRole("heading", { name: "Stabilize device smoke" })).toBeInTheDocument();
    expect(screen.getAllByText("playwright-runner").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Build UI shell" })).not.toBeInTheDocument();
  });

  it("shows a plugins entry point in the cockpit sidebar", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plugins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open plugin bay" })).toBeInTheDocument();
  });

  it("returns to the cockpit from the product mark", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

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
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

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
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skill Sources" }));

    expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mission Control" })).not.toBeInTheDocument();
    expect(screen.getByText("superpowers")).toBeInTheDocument();
    expect(screen.getByText("Pending validation")).toBeInTheDocument();

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
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Harness Studio" }));

    expect(await screen.findByRole("heading", { name: "Harness Studio" })).toBeInTheDocument();
    expect(screen.getByText("Pi Execution Discipline")).toBeInTheDocument();
    expect(screen.getByText("Execution Discipline")).toBeInTheDocument();
  });

  it("opens Agent Studio with the saved developer agent", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agent Studio" }));

    expect(await screen.findByRole("heading", { name: "Agent Studio" })).toBeInTheDocument();
    expect(screen.getByText("Developer Agent")).toBeInTheDocument();
    expect(screen.getByText("pi-execution-discipline")).toBeInTheDocument();
  });

  it("renders an error state when the desktop command fails", async () => {
    render(
      <App
        agentStudioInvoke={() => Promise.resolve(agentStudioSnapshot)}
        harnessStudioInvoke={() => Promise.resolve(harnessStudioSnapshot)}
        missionControlInvoke={() => Promise.reject(new Error("command failed"))}
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
