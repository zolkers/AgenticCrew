import type {
  AgentStudioSnapshot,
  CreateAgentTemplateRequest,
  SetAgentTemplateActiveRequest
} from "../types/core";

export type AgentStudioCommand =
  | "agent_studio_snapshot"
  | "create_agent_template"
  | "set_agent_template_active";

export type InvokeAgentStudio = (
  command: AgentStudioCommand,
  args?: Record<string, unknown>
) => Promise<AgentStudioSnapshot>;

export async function loadAgentStudioSnapshot(invoke: InvokeAgentStudio): Promise<AgentStudioSnapshot> {
  return invoke("agent_studio_snapshot");
}

export async function createAgentTemplate(
  invoke: InvokeAgentStudio,
  request: CreateAgentTemplateRequest
): Promise<AgentStudioSnapshot> {
  return invoke("create_agent_template", { request });
}

export async function setAgentTemplateActive(
  invoke: InvokeAgentStudio,
  request: SetAgentTemplateActiveRequest
): Promise<AgentStudioSnapshot> {
  return invoke("set_agent_template_active", { request });
}
