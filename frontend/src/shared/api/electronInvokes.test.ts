import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  electronAgentStudioInvoke,
  electronHarnessStudioInvoke,
  electronMissionControlInvoke,
  electronSettingsInvoke,
  electronSkillSourcesInvoke
} from "./electronInvokes";

describe("electronInvokes", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "agenticcrew");
  });

  it("forwards snapshot commands through the Electron bridge", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    window.agenticcrew = { invoke };

    await expect(electronMissionControlInvoke("mission_control_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronSkillSourcesInvoke("skill_sources_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronHarnessStudioInvoke("harness_studio_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronAgentStudioInvoke("agent_studio_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronSettingsInvoke("settings_snapshot")).resolves.toEqual({ ok: true });

    expect(invoke).toHaveBeenCalledWith("mission_control_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("skill_sources_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("harness_studio_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("agent_studio_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("settings_snapshot", undefined);
  });

  it("forwards command args through the Electron bridge", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    window.agenticcrew = { invoke };

    await expect(electronSkillSourcesInvoke("sync_github_skill_source", { sourceId: "superpowers" })).resolves
      .toBeUndefined();
    await expect(electronHarnessStudioInvoke("set_harness_profile_active", {
      request: { active: false, profileId: "local" }
    })).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith("sync_github_skill_source", { sourceId: "superpowers" });
    expect(invoke).toHaveBeenCalledWith("set_harness_profile_active", {
      request: { active: false, profileId: "local" }
    });
  });

  it("rejects when the Electron bridge is unavailable", async () => {
    await expect(electronMissionControlInvoke("mission_control_snapshot")).rejects.toThrow(
      "AgenticCrew Electron bridge unavailable"
    );
  });
});
