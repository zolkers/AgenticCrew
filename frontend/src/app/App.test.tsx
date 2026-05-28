import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type { MissionControlSnapshot } from "../shared/types/core";

function createDeferredSnapshot() {
  let resolveSnapshot = (snapshot: MissionControlSnapshot): void => {
    throw new Error(`Deferred snapshot resolve was used before assignment: ${snapshot.currentCheckpoint}`);
  };
  let rejectSnapshot = (error: Error): void => {
    throw new Error(`Deferred snapshot reject was used before assignment: ${error.message}`);
  };
  const promise = new Promise<MissionControlSnapshot>((resolve, reject) => {
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
    render(<App />);

    expect(screen.getByText("Loading Mission Control")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
  });

  it("renders injected mission control data instead of fallback data", async () => {
    const snapshot: MissionControlSnapshot = {
      activeAgentCount: 9,
      activeSessionCount: 5,
      currentCheckpoint: "Injected from invoke",
      currentCostUsd: 4.75,
      humanGateStatus: "open",
      model: "gpt-5",
      provider: "openai"
    };

    render(<App missionControlInvoke={() => Promise.resolve(snapshot)} />);

    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Design approved")).not.toBeInTheDocument());
  });

  it("renders an error state when the desktop command fails", async () => {
    render(<App missionControlInvoke={() => Promise.reject(new Error("command failed"))} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mission Control unavailable");
  });

  it("ignores loaded data after unmount", async () => {
    const pendingSnapshot = createDeferredSnapshot();
    const { unmount } = render(<App missionControlInvoke={() => pendingSnapshot.promise} />);

    unmount();
    pendingSnapshot.resolveSnapshot({
      activeAgentCount: 1,
      activeSessionCount: 1,
      currentCheckpoint: "Unmounted success",
      currentCostUsd: 1,
      humanGateStatus: "open",
      model: "gpt-5",
      provider: "openai"
    });
    await pendingSnapshot.promise;

    expect(screen.queryByText("Unmounted success")).not.toBeInTheDocument();
  });

  it("ignores load failures after unmount", async () => {
    const pendingSnapshot = createDeferredSnapshot();
    const { unmount } = render(<App missionControlInvoke={() => pendingSnapshot.promise} />);

    unmount();
    pendingSnapshot.rejectSnapshot(new Error("unmounted failure"));

    await expect(pendingSnapshot.promise).rejects.toThrow("unmounted failure");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the browser fallback only when no invoke dependency is supplied", async () => {
    render(<App />);

    expect(await screen.findByText("Design approved")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
