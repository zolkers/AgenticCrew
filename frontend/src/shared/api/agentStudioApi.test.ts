import { describe, expect, it } from "vitest";
import { loadAgentStudioSnapshot } from "./agentStudioApi";

describe("agentStudioApi", () => {
  it("loads the Rust agent_studio_snapshot command through the injected invoke", async () => {
    const snapshot = {
      activeTemplateCount: 1,
      templates: [],
      trainingRuns: []
    };

    await expect(
      loadAgentStudioSnapshot((command) => {
        expect(command).toBe("agent_studio_snapshot");
        return Promise.resolve(snapshot);
      })
    ).resolves.toEqual(snapshot);
  });
});
