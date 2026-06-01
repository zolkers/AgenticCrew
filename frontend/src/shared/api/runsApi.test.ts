import { describe, expect, it, vi } from "vitest";
import { loadRunsSnapshot, startRun, type InvokeRuns } from "./runsApi";

describe("runsApi", () => {
  it("loads the runs snapshot", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: null,
      events: [],
      runs: []
    });

    await expect(loadRunsSnapshot(invoke)).resolves.toEqual({
      activeRunId: null,
      events: [],
      runs: []
    });
    expect(invoke).toHaveBeenCalledWith("runs_snapshot");
  });

  it("starts a run with a request payload", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: "run-1",
      events: [],
      runs: []
    });

    await startRun(invoke, {
      agentTemplateId: "developer-pi",
      harnessProfileId: "pi-execution-discipline",
      id: "run-1",
      modelId: "gpt-5",
      providerId: "openai",
      skillRoutes: ["agenticcrew://skills/superpowers/planning"],
      task: "Build the Workbench",
      workspaceId: "fullstack-app"
    });

    expect(invoke).toHaveBeenCalledWith("start_run", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        id: "run-1",
        modelId: "gpt-5",
        providerId: "openai",
        skillRoutes: ["agenticcrew://skills/superpowers/planning"],
        task: "Build the Workbench",
        workspaceId: "fullstack-app"
      }
    });
  });
});
