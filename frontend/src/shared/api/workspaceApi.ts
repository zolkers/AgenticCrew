import type {
  CreateWorkspaceRequest,
  CommitPreviewRequest,
  CommitPreviewResponse,
  RefreshWorkspaceGitStatusRequest,
  UpdateWorkspaceGitContextRequest,
  UpdateWorkspaceLoadoutRequest,
  WorkspaceSnapshot
} from "../types/core";

export type WorkspaceCommand =
  | "create_workspace"
  | "refresh_workspace_git_status"
  | "update_workspace_git_context"
  | "update_workspace_loadout"
  | "workspace_snapshot";

export type InvokeWorkspace = (
  command: WorkspaceCommand,
  args?: Record<string, unknown>
) => Promise<WorkspaceSnapshot>;

export type InvokeCommitPreview = (
  command: "commit_preview",
  args?: Record<string, unknown>
) => Promise<CommitPreviewResponse>;

export async function loadWorkspaceSnapshot(invoke: InvokeWorkspace): Promise<WorkspaceSnapshot> {
  return invoke("workspace_snapshot");
}

export async function createWorkspace(
  invoke: InvokeWorkspace,
  request: CreateWorkspaceRequest
): Promise<WorkspaceSnapshot> {
  return invoke("create_workspace", { request });
}

export async function updateWorkspaceGitContext(
  invoke: InvokeWorkspace,
  request: UpdateWorkspaceGitContextRequest
): Promise<WorkspaceSnapshot> {
  return invoke("update_workspace_git_context", { request });
}

export async function refreshWorkspaceGitStatus(
  invoke: InvokeWorkspace,
  request: RefreshWorkspaceGitStatusRequest
): Promise<WorkspaceSnapshot> {
  return invoke("refresh_workspace_git_status", { request });
}

export async function loadCommitPreview(
  invoke: InvokeCommitPreview,
  request: CommitPreviewRequest
): Promise<CommitPreviewResponse> {
  return invoke("commit_preview", { request });
}

export async function updateWorkspaceLoadout(
  invoke: InvokeWorkspace,
  request: UpdateWorkspaceLoadoutRequest
): Promise<WorkspaceSnapshot> {
  return invoke("update_workspace_loadout", { request });
}
