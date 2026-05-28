import { describe, expect, it } from "vitest";
import { loadSkillSourcesSnapshot } from "./skillSourcesApi";
import type { SkillSourcesSnapshot } from "../types/core";

describe("loadSkillSourcesSnapshot", () => {
  it("loads the Rust skill_sources_snapshot command through the injected invoke", async () => {
    const rustSnapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: []
    };

    const snapshot = await loadSkillSourcesSnapshot((command) => {
      expect(command).toBe("skill_sources_snapshot");
      return Promise.resolve(rustSnapshot);
    });

    expect(snapshot).toEqual(rustSnapshot);
  });
});
