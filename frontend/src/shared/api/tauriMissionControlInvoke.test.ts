import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriMissionControlInvoke } from "./tauriMissionControlInvoke";
import type { MissionControlSnapshot } from "../types/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriMissionControlInvoke", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("forwards the typed Mission Control command to Tauri invoke", async () => {
    const snapshot: MissionControlSnapshot = {
      activeAgentCount: 4,
      activeSessionCount: 2,
      checkpoints: [],
      costSummary: {
        modelCallCount: 1,
        totalUsd: 3.25
      },
      currentCheckpoint: "Tauri command",
      currentCostUsd: 3.25,
      gitSummary: {
        activeBranches: ["dev"],
        workspaceCount: 1
      },
      humanGateStatus: "blocked",
      model: "gpt-5",
      provider: "openai",
      recentEvidence: [],
      sessions: [],
      skillSummary: {
        activeSourceCount: 0,
        discoveredSkillCount: 0,
        sourceCount: 0
      }
    };
    vi.mocked(invoke).mockResolvedValue(snapshot);

    await expect(tauriMissionControlInvoke("mission_control_snapshot")).resolves.toEqual(snapshot);
    expect(invoke).toHaveBeenCalledWith("mission_control_snapshot");
  });
});
