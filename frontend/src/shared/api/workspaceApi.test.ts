import { describe, expect, it } from "vitest";
import {
  createWorkspace,
  loadWorkspaceSnapshot,
  refreshWorkspaceGitStatus,
  updateWorkspaceGitContext,
  updateWorkspaceLoadout,
  type InvokeWorkspace
} from "./workspaceApi";

describe("workspaceApi", () => {
  it("loads the workspace snapshot", async () => {
    const snapshot = { workspaces: [] };

    await expect(loadWorkspaceSnapshot((command) => {
      expect(command).toBe("workspace_snapshot");

      return Promise.resolve(snapshot);
    })).resolves.toBe(snapshot);
  });

  it("creates and updates workspace records through command requests", async () => {
    const snapshot = { workspaces: [] };
    const createRequest = {
      branch: "main",
      id: "api",
      mission: "Build API",
      name: "API",
      path: "D:\\api"
    };
    const updateRequest = {
      branch: "feature/api",
      path: "D:\\api",
      workspaceId: "api"
    };
    const loadoutRequest = {
      agentTemplateId: "developer-pi",
      harnessProfileId: "pi-execution-discipline",
      workspaceId: "api"
    };
    const calls: unknown[] = [];
    const invoke: InvokeWorkspace = (command, args) => {
      calls.push([command, args]);

      return Promise.resolve(snapshot);
    };

    await createWorkspace(invoke, createRequest);
    await updateWorkspaceGitContext(invoke, updateRequest);
    await refreshWorkspaceGitStatus(invoke, { workspaceId: "api" });
    await updateWorkspaceLoadout(invoke, loadoutRequest);

    expect(calls).toEqual([
      ["create_workspace", { request: createRequest }],
      ["update_workspace_git_context", { request: updateRequest }],
      ["refresh_workspace_git_status", { request: { workspaceId: "api" } }],
      ["update_workspace_loadout", { request: loadoutRequest }]
    ]);
  });
});
