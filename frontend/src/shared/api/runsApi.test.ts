import { describe, expect, it, vi } from "vitest";
import {
  completeRun,
  failRun,
  loadRunsSnapshot,
  prepareRun,
  recordRunCommand,
  startPreparedRun,
  startRun,
  type InvokeRuns
} from "./runsApi";

describe("runsApi", () => {
  it("loads the runs snapshot", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: null,
      commands: [],
      events: [],
      runs: []
    });

    await expect(loadRunsSnapshot(invoke)).resolves.toEqual({
      activeRunId: null,
      commands: [],
      events: [],
      runs: []
    });
    expect(invoke).toHaveBeenCalledWith("runs_snapshot");
  });

  it("starts a run with a request payload", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: "run-1",
      commands: [],
      events: [],
      runs: []
    });

    await startRun(invoke, {
      agentTemplateId: "developer-pi",
      harnessProfileId: "pi-execution-discipline",
      id: "run-1",
      modelId: "gpt-5",
      providerId: "openai",
      reasoningEffort: "high",
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
        reasoningEffort: "high",
        skillRoutes: ["agenticcrew://skills/superpowers/planning"],
        task: "Build the Workbench",
        workspaceId: "fullstack-app"
      }
    });
  });

  it("sends run lifecycle commands with the run id", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: "run-1",
      commands: [],
      events: [],
      runs: []
    });

    await prepareRun(invoke, "run-1");
    await startPreparedRun(invoke, "run-1");
    await completeRun(invoke, "run-1");
    await failRun(invoke, "run-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(2, "start_prepared_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "complete_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "fail_run", { runId: "run-1" });
  });

  it("records audited run command evidence", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: "run-1",
      commands: [],
      events: [],
      runs: []
    });

    await recordRunCommand(invoke, {
      command: "npm test",
      cwd: "C:\\repo",
      exitCode: 0,
      participantId: "developer",
      runId: "run-1",
      stderr: "",
      stdout: "ok"
    });

    expect(invoke).toHaveBeenCalledWith("record_run_command", {
      request: {
        command: "npm test",
        cwd: "C:\\repo",
        exitCode: 0,
        participantId: "developer",
        runId: "run-1",
        stderr: "",
        stdout: "ok"
      }
    });
  });
});
