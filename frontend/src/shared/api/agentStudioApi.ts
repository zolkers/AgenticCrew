import type {
  AgentStudioSnapshot,
  CreateAgentTemplateRequest,
  PromoteAgentTrainingRunRequest,
  SetAgentTemplateActiveRequest,
  UpdateAgentTemplateRequest
} from "../types/core";

export type AgentStudioCommand =
  | "agent_studio_snapshot"
  | "create_agent_template"
  | "set_agent_template_active"
  | "update_agent_template"
  | "promote_agent_training_run";

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

export async function updateAgentTemplate(
  invoke: InvokeAgentStudio,
  request: UpdateAgentTemplateRequest
): Promise<AgentStudioSnapshot> {
  return invoke("update_agent_template", { request });
}

export async function promoteAgentTrainingRun(
  invoke: InvokeAgentStudio,
  request: PromoteAgentTrainingRunRequest
): Promise<AgentStudioSnapshot> {
  return invoke("promote_agent_training_run", { request });
}
