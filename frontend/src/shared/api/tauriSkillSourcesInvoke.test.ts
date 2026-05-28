import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriSkillSourcesInvoke } from "./tauriSkillSourcesInvoke";
import type { SkillSourcesSnapshot } from "../types/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriSkillSourcesInvoke", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("forwards the typed skill sources command to Tauri invoke", async () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: []
    };
    vi.mocked(invoke).mockResolvedValue(snapshot);

    await expect(tauriSkillSourcesInvoke("skill_sources_snapshot")).resolves.toEqual(snapshot);
    expect(invoke).toHaveBeenCalledWith("skill_sources_snapshot");
  });
});
