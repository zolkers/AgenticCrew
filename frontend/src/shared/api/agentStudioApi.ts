import type { AgentStudioSnapshot } from "../types/core";

export type InvokeAgentStudio = (command: "agent_studio_snapshot") => Promise<AgentStudioSnapshot>;

export async function loadAgentStudioSnapshot(invoke: InvokeAgentStudio): Promise<AgentStudioSnapshot> {
  return invoke("agent_studio_snapshot");
}
