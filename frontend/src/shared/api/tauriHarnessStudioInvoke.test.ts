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

    await expect(tauriHarnessStudioInvoke("harness_studio_snapshot")).resolves.toEqual({
      activeProfileCount: 0,
      bindings: [],
      profiles: []
    });

    expect(invoke).toHaveBeenCalledWith("harness_studio_snapshot");
  });
});
