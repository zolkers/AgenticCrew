import { describe, expect, it } from "vitest";
import {
  createWorkspace,
  loadCommitPreview,
  loadWorkspaceSnapshot,
  refreshWorkspaceGitStatus,
  updateWorkspaceGitContext,
  updateWorkspaceLoadout,
  updateWorkspaceRuntimePolicy,
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
    const runtimePolicyRequest = {
      allowedPrograms: ["node", "npm"],
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
    await updateWorkspaceRuntimePolicy(invoke, runtimePolicyRequest);

    expect(calls).toEqual([
      ["create_workspace", { request: createRequest }],
      ["update_workspace_git_context", { request: updateRequest }],
      ["refresh_workspace_git_status", { request: { workspaceId: "api" } }],
      ["update_workspace_loadout", { request: loadoutRequest }],
      ["update_workspace_runtime_policy", { request: runtimePolicyRequest }]
    ]);
  });

  it("loads commit previews through the backend command", async () => {
    const preview = {
      commitHash: "abc1234",
      files: [],
      metadata: {
        authoredAt: "2026-05-29T12:00:00Z",
        authorEmail: "codex@example.com",
        authorName: "Codex",
        body: "",
        hash: "abc1234",
        shortHash: "abc1234",
        subject: "feat(git): preview"
      },
      workspaceId: "api"
    };
    const invoke = (command: "commit_preview", args?: Record<string, unknown>) => {
      expect(command).toBe("commit_preview");
      expect(args).toEqual({
        request: {
          commitHash: "abc1234",
          workspaceId: "api"
        }
      });

      return Promise.resolve(preview);
    };

    await expect(loadCommitPreview(invoke, { commitHash: "abc1234", workspaceId: "api" })).resolves.toBe(preview);
  });
});
