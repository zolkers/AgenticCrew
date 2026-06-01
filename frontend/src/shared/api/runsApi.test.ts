import { describe, expect, it, vi } from "vitest";
import {
  completeRun,
  executeRunCommand,
  failRun,
  killRun,
  loadRunsSnapshot,
  pauseRun,
  prepareRun,
  recordRunCommand,
  resumeRun,
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
    await pauseRun(invoke, "run-1");
    await resumeRun(invoke, "run-1");
    await killRun(invoke, "run-1");
    await completeRun(invoke, "run-1");
    await failRun(invoke, "run-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(2, "start_prepared_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "pause_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "resume_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(5, "kill_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(6, "complete_run", { runId: "run-1" });
    expect(invoke).toHaveBeenNthCalledWith(7, "fail_run", { runId: "run-1" });
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

  it("executes a controlled run command payload", async () => {
    const invoke = vi.fn<InvokeRuns>().mockResolvedValue({
      activeRunId: "run-1",
      commands: [],
      events: [],
      runs: []
    });

    await executeRunCommand(invoke, {
      args: ["--version"],
      cwd: null,
      participantId: "developer",
      program: "node",
      runId: "run-1"
    });

    expect(invoke).toHaveBeenCalledWith("execute_run_command", {
      request: {
        args: ["--version"],
        cwd: null,
        participantId: "developer",
        program: "node",
        runId: "run-1"
      }
    });
  });
});
