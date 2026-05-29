import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriAgentStudioInvoke } from "./tauriAgentStudioInvoke";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriAgentStudioInvoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the agent studio command", async () => {
    vi.mocked(invoke).mockResolvedValue({ activeTemplateCount: 0, templates: [], trainingRuns: [] });

    await expect(tauriAgentStudioInvoke("agent_studio_snapshot")).resolves.toEqual({
      activeTemplateCount: 0,
      templates: [],
      trainingRuns: []
    });

    expect(invoke).toHaveBeenCalledWith("agent_studio_snapshot", undefined);
  });

  it("forwards agent studio command args", async () => {
    vi.mocked(invoke).mockResolvedValue({ activeTemplateCount: 0, templates: [], trainingRuns: [] });

    await expect(
      tauriAgentStudioInvoke("promote_agent_training_run", {
        request: { trainingRunId: "train-release" }
      })
    ).resolves.toEqual({
      activeTemplateCount: 0,
      templates: [],
      trainingRuns: []
    });

    expect(invoke).toHaveBeenCalledWith("promote_agent_training_run", {
      request: {
        trainingRunId: "train-release"
      }
    });
  });
});
