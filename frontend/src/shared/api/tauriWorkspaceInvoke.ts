import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceSnapshot } from "../types/core";
import type { InvokeWorkspace } from "./workspaceApi";

export const tauriWorkspaceInvoke: InvokeWorkspace = (command, args) =>
  invoke<WorkspaceSnapshot>(command, args);
