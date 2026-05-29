import { invoke } from "@tauri-apps/api/core";
import type { AgentStudioSnapshot } from "../types/core";
import type { InvokeAgentStudio } from "./agentStudioApi";

export const tauriAgentStudioInvoke: InvokeAgentStudio = (command) =>
  invoke<AgentStudioSnapshot>(command);
