import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriHarnessStudioInvoke } from "./tauriHarnessStudioInvoke";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriHarnessStudioInvoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the harness studio command", async () => {
    vi.mocked(invoke).mockResolvedValue({ activeProfileCount: 0, bindings: [], profiles: [] });

    await expect(tauriHarnessStudioInvoke("create_harness_profile", { request: { id: "local" } })).resolves.toEqual({
      activeProfileCount: 0,
      bindings: [],
      profiles: []
    });

    expect(invoke).toHaveBeenCalledWith("create_harness_profile", { request: { id: "local" } });
  });

  it("forwards harness studio command args", async () => {
    vi.mocked(invoke).mockResolvedValue({ activeProfileCount: 0, bindings: [], profiles: [] });

    await expect(
      tauriHarnessStudioInvoke("update_harness_profile", {
        request: { basePolicy: "Validate", description: "Local", name: "Local", profileId: "local" }
      })
    ).resolves.toEqual({
      activeProfileCount: 0,
      bindings: [],
      profiles: []
    });

    expect(invoke).toHaveBeenCalledWith("update_harness_profile", {
      request: { basePolicy: "Validate", description: "Local", name: "Local", profileId: "local" }
    });
  });
});
