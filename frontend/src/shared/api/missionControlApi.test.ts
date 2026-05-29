import { describe, expect, it } from "vitest";
import { loadMissionControlSnapshot } from "./missionControlApi";
import type { MissionControlSnapshot } from "../types/core";

describe("loadMissionControlSnapshot", () => {
  it("loads the Rust mission_control_snapshot command through the injected invoke", async () => {
    const rustSnapshot: MissionControlSnapshot = {
      activeAgentCount: 7,
      activeSessionCount: 3,
      checkpoints: [],
      costSummary: {
        modelCallCount: 1,
        totalUsd: 2.5
      },
      currentCheckpoint: "Tests are red",
      currentCostUsd: 2.5,
      gitSummary: {
        activeBranches: ["dev"],
        workspaceCount: 1
      },
      humanGateStatus: "pending",
      model: "gpt-5-mini",
      provider: "openai",
      recentEvidence: [],
      sessions: [],
      skillSummary: {
        activeSourceCount: 0,
        discoveredSkillCount: 0,
        sourceCount: 0
      }
    };
    const calls: string[] = [];

    const snapshot = await loadMissionControlSnapshot((command) => {
      calls.push(command);
      return Promise.resolve(rustSnapshot);
    });

    expect(calls).toEqual(["mission_control_snapshot"]);
    expect(snapshot).toEqual(rustSnapshot);
  });

});
