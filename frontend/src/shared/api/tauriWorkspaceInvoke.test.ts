import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriWorkspaceInvoke } from "./tauriWorkspaceInvoke";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriWorkspaceInvoke", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("passes workspace commands to Tauri", async () => {
    const snapshot = { workspaces: [] };
    vi.mocked(invoke).mockResolvedValue(snapshot);

    await expect(tauriWorkspaceInvoke("workspace_snapshot")).resolves.toBe(snapshot);
    await expect(
      tauriWorkspaceInvoke("update_workspace_git_context", {
        request: { branch: "main", path: "D:\\repo", workspaceId: "repo" }
      })
    ).resolves.toBe(snapshot);
    await expect(
      tauriWorkspaceInvoke("update_workspace_loadout", {
        request: {
          agentTemplateId: "developer-pi",
          harnessProfileId: "pi-execution-discipline",
          workspaceId: "repo"
        }
      })
    ).resolves.toBe(snapshot);

    expect(invoke).toHaveBeenNthCalledWith(1, "workspace_snapshot", undefined);
    expect(invoke).toHaveBeenNthCalledWith(2, "update_workspace_git_context", {
      request: { branch: "main", path: "D:\\repo", workspaceId: "repo" }
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "update_workspace_loadout", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        workspaceId: "repo"
      }
    });
  });
});
