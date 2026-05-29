export type HumanGateStatus = "open" | "pending" | "blocked";

export type MissionControlSnapshot = {
  activeAgentCount: number;
  activeSessionCount: number;
  currentCheckpoint: string;
  currentCostUsd: number;
  humanGateStatus: HumanGateStatus;
  model: string;
  provider: string;
};

export type SkillSourceKind = "bundled" | "local" | "git_hub";
export type SkillSourceTrustLevel = "built_in" | "local" | "external";
export type SkillSourceActivationStatus = "pending_validation" | "validated" | "rejected" | "sync_failed";
export type SkillSourceSyncStatus = "never_synced" | "synced" | "failed";

export type FileSystemPermissionScope = {
  path: string;
  writable: boolean;
};

export type NetworkPermissionScope = {
  host: string;
};

export type CommandPermissionScope = {
  command: string;
};

export type ApprovedPermissionPolicy = {
  commands: CommandPermissionScope[];
  docker: boolean;
  fileSystem: FileSystemPermissionScope[];
  git: boolean;
  network: NetworkPermissionScope[];
};

export type PermissionGate = {
  approved: boolean;
  policy: ApprovedPermissionPolicy;
};

export type DiscoveredSkillManifest = {
  description: string;
  id: string;
  name: string;
  relativePath: string;
  route: string;
};

export type SkillManifestValidationError = {
  message: string;
  relativePath: string;
};

export type SkillSource = {
  active: boolean;
  discoveredSkills?: DiscoveredSkillManifest[];
  id: string;
  kind: SkillSourceKind;
  lastSyncError?: string | null;
  lastSyncStatus: SkillSourceSyncStatus;
  lastSyncedCommit?: string | null;
  localCachePath?: string | null;
  permissionGate: PermissionGate;
  repositoryUrl: string;
  selectedRef: string;
  status: SkillSourceActivationStatus;
  trustLevel: SkillSourceTrustLevel;
  validationErrors?: SkillManifestValidationError[];
};

export type SkillSourcesSnapshot = {
  activeSourceCount: number;
  sources: SkillSource[];
};

export type HarnessModuleKind =
  | "base_policy"
  | "behavior_rule"
  | "tool_rule"
  | "safety_rule"
  | "output_style"
  | "project_memory"
  | "agent_persona";

export type HarnessTrustLevel = "built_in" | "local" | "external";

export type HarnessModuleSource = {
  route?: string | null;
  sourceId: string;
  trustLevel: HarnessTrustLevel;
};

export type HarnessModule = {
  content: string;
  enabled: boolean;
  id: string;
  kind: HarnessModuleKind;
  name: string;
  source: HarnessModuleSource;
  version: string;
};

export type HarnessProfile = {
  active: boolean;
  description: string;
  id: string;
  modules: HarnessModule[];
  name: string;
  skillRoutes: string[];
  version: string;
};

export type HarnessBindingTargetKind = "workspace" | "agent" | "skill" | "run";

export type HarnessBinding = {
  harnessProfileId: string;
  targetId: string;
  targetKind: HarnessBindingTargetKind;
};

export type HarnessStudioSnapshot = {
  activeProfileCount: number;
  bindings: HarnessBinding[];
  profiles: HarnessProfile[];
};

export type CreateHarnessProfileRequest = {
  active: boolean;
  basePolicy: string;
  description: string;
  id: string;
  name: string;
};

export type SetHarnessProfileActiveRequest = {
  active: boolean;
  profileId: string;
};

export type UpdateHarnessProfileRequest = {
  basePolicy: string;
  description: string;
  name: string;
  profileId: string;
};

export type AgentTemplate = {
  active: boolean;
  budgetCents: number;
  description: string;
  harnessProfileId?: string | null;
  id: string;
  modelId: string;
  name: string;
  providerId: string;
  role: string;
  skillRoutes: string[];
  version: number;
};

export type AgentTrainingStatus = "draft" | "running" | "completed" | "failed" | "promoted";

export type AgentTrainingRun = {
  agentTemplateId: string;
  criticScore?: number | null;
  datasetId: string;
  id: string;
  promotedVersion?: number | null;
  status: AgentTrainingStatus;
};

export type AgentStudioSnapshot = {
  activeTemplateCount: number;
  templates: AgentTemplate[];
  trainingRuns: AgentTrainingRun[];
};

export type CreateAgentTemplateRequest = {
  active: boolean;
  budgetCents: number;
  description: string;
  harnessProfileId?: string | null;
  id: string;
  modelId: string;
  name: string;
  providerId: string;
  role: string;
  skillRoutes: string[];
};

export type SetAgentTemplateActiveRequest = {
  active: boolean;
  templateId: string;
};

export type UpdateAgentTemplateRequest = {
  budgetCents: number;
  description: string;
  harnessProfileId?: string | null;
  modelId: string;
  name: string;
  providerId: string;
  role: string;
  skillRoutes: string[];
  templateId: string;
};

export type AiProviderSettings = {
  apiKeyConfigured: boolean;
  apiKeyLastFour?: string | null;
  displayName: string;
  providerId: string;
  selectedModelId: string;
};

export type SettingsSnapshot = {
  aiProvider: AiProviderSettings;
};

export type UpdateAiProviderSettingsRequest = {
  apiKey?: string | null;
  providerId: string;
  selectedModelId: string;
};

export type ElectronCommandMap = {
  approve_skill_source_permissions: unknown;
  agent_studio_snapshot: AgentStudioSnapshot;
  create_agent_template: AgentStudioSnapshot;
  create_harness_profile: HarnessStudioSnapshot;
  harness_studio_snapshot: HarnessStudioSnapshot;
  inspect_cached_skill_source: unknown;
  mission_control_snapshot: MissionControlSnapshot;
  settings_snapshot: SettingsSnapshot;
  set_agent_template_active: AgentStudioSnapshot;
  set_harness_profile_active: HarnessStudioSnapshot;
  skill_sources_snapshot: SkillSourcesSnapshot;
  sync_github_skill_source: unknown;
  update_agent_template: AgentStudioSnapshot;
  update_ai_provider_settings: SettingsSnapshot;
  update_harness_profile: HarnessStudioSnapshot;
};
