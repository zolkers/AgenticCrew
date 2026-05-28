import { describe, expect, it } from "vitest";
import { loadMissionControlSnapshot } from "./missionControlApi";
import type { MissionControlSnapshot } from "../types/core";

describe("loadMissionControlSnapshot", () => {
  it("loads the Rust mission_control_snapshot command through the injected invoke", async () => {
    const rustSnapshot: MissionControlSnapshot = {
      activeAgentCount: 7,
      activeSessionCount: 3,
      currentCheckpoint: "Tests are red",
      currentCostUsd: 2.5,
      humanGateStatus: "pending",
      model: "gpt-5-mini",
      provider: "openai"
    };
    const calls: string[] = [];

    const snapshot = await loadMissionControlSnapshot((command) => {
      calls.push(command);
      return Promise.resolve(rustSnapshot);
    });

    expect(calls).toEqual(["mission_control_snapshot"]);
    expect(snapshot).toEqual(rustSnapshot);
  });

  it("returns a browser fallback snapshot when no invoke dependency is provided", async () => {
    const snapshot = await loadMissionControlSnapshot();

    expect(snapshot).toEqual({
      activeAgentCount: 3,
      activeSessionCount: 1,
      currentCheckpoint: "Design approved",
      currentCostUsd: 0,
      humanGateStatus: "pending",
      model: "gpt-4o",
      provider: "openai"
    });
  });
});
