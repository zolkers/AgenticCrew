import { describe, expect, it } from "vitest";
import { loadMissionControlSnapshot, recordModelCallEstimate } from "./missionControlApi";
import type { MissionControlSnapshot } from "../types/core";

describe("loadMissionControlSnapshot", () => {
  it("loads the Rust mission_control_snapshot command through the injected invoke", async () => {
    const rustSnapshot: MissionControlSnapshot = {
      activeModel: {
        modelId: "gpt-5-mini",
        providerId: "openai"
      },
      activeProvider: {
        displayName: "OpenAI",
        providerId: "openai"
      },
      activeWorkspace: null,
      activeAgentCount: 7,
      activeSessionCount: 3,
      checkpoints: [],
      costSummary: {
        modelCallCount: 1,
        tokenLimit: 1_000_000,
        totalTokens: 250,
        totalUsd: 2.5
      },
      currentCheckpoint: "Tests are red",
      currentCostUsd: 2.5,
      gitSummary: {
        activeBranches: ["dev"],
        workspaceCount: 1
      },
      humanGateStatus: "pending",
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

  it("records model call estimates through a named request payload", async () => {
    const calls: Array<{ args?: Record<string, unknown>; command: string }> = [];
    const rustSnapshot: MissionControlSnapshot = {
      activeModel: {
        modelId: "gpt-live",
        providerId: "openai"
      },
      activeProvider: {
        displayName: "OpenAI",
        providerId: "openai"
      },
      activeWorkspace: null,
      activeAgentCount: 0,
      activeSessionCount: 0,
      checkpoints: [],
      costSummary: {
        modelCallCount: 1,
        tokenLimit: 1_000_000,
        totalTokens: 150,
        totalUsd: 0.42
      },
      currentCheckpoint: "initial",
      currentCostUsd: 0.42,
      gitSummary: {
        activeBranches: [],
        workspaceCount: 0
      },
      humanGateStatus: "open",
      recentEvidence: [],
      sessions: [],
      skillSummary: {
        activeSourceCount: 0,
        discoveredSkillCount: 0,
        sourceCount: 0
      }
    };

    const snapshot = await recordModelCallEstimate((command, args) => {
      calls.push({ args, command });
      return Promise.resolve(rustSnapshot);
    }, {
      agentId: "developer",
      cachedTokens: 25,
      estimatedCostUsd: 0.42,
      inputTokens: 100,
      model: "gpt-live",
      outputTokens: 50,
      provider: "openai"
    });

    expect(calls).toEqual([
      {
        args: {
          request: {
            agentId: "developer",
            cachedTokens: 25,
            estimatedCostUsd: 0.42,
            inputTokens: 100,
            model: "gpt-live",
            outputTokens: 50,
            provider: "openai"
          }
        },
        command: "record_model_call_estimate"
      }
    ]);
    expect(snapshot).toEqual(rustSnapshot);
  });

});
