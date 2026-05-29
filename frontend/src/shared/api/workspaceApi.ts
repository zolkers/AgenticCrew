import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceGitContextRequest,
  UpdateWorkspaceLoadoutRequest,
  WorkspaceSnapshot
} from "../types/core";

export type WorkspaceCommand =
  | "create_workspace"
  | "update_workspace_git_context"
  | "update_workspace_loadout"
  | "workspace_snapshot";

export type InvokeWorkspace = (
  command: WorkspaceCommand,
  args?: Record<string, unknown>
) => Promise<WorkspaceSnapshot>;

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

export async function updateWorkspaceLoadout(
  invoke: InvokeWorkspace,
  request: UpdateWorkspaceLoadoutRequest
): Promise<WorkspaceSnapshot> {
  return invoke("update_workspace_loadout", { request });
}
