import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type { MissionControlSnapshot, SkillSourcesSnapshot } from "../shared/types/core";

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
      repositoryUrl: "https://github.com/obra/superpowers",
      selectedRef: "main",
      status: "pending_validation",
      trustLevel: "external"
    }
  ]
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

  it("renders Mission Control as the default screen", async () => {
    render(
      <App
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(screen.getByText("Loading Mission Control")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
  });

  it("renders injected mission control data", async () => {
    render(
      <App
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders injected skill source data", async () => {
    render(
      <App
        missionControlInvoke={() => Promise.resolve(missionControlSnapshot)}
        skillSourcesInvoke={() => Promise.resolve(skillSourcesSnapshot)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    expect(screen.getByText("superpowers")).toBeInTheDocument();
    expect(screen.getByText("Pending validation")).toBeInTheDocument();
  });

  it("renders an error state when the desktop command fails", async () => {
    render(
      <App
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
