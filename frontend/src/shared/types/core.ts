export type HumanGateStatus = "open" | "pending" | "blocked";

export type MissionControlSnapshot = {
  activeModel: MissionActiveModel;
  activeProvider: MissionActiveProvider;
  activeWorkspace: MissionActiveWorkspace | null;
  activeAgentCount: number;
  activeSessionCount: number;
  checkpoints: MissionCheckpointSummary[];
  costSummary: MissionCostSummary;
  currentCheckpoint: string;
  currentCostUsd: number;
  gitSummary: MissionGitSummary;
  humanGateStatus: HumanGateStatus;
  recentEvidence: MissionEvidenceSummary[];
  sessions: MissionSessionSummary[];
  skillSummary: MissionSkillSummary;
};

export type MissionActiveWorkspace = {
  branch: string;
  id: string;
  mission: string;
  name: string;
  path: string;
  status: "configured" | "running";
};

export type MissionActiveProvider = {
  displayName: string;
  providerId: string;
};

export type MissionActiveModel = {
  modelId: string;
  providerId: string;
};

export type MissionSessionSummary = {
  branch: string;
  checkpointCount: number;
  id: string;
  pendingCheckpointCount: number;
  status:
    | "archived"
    | "blocked"
    | "closed"
    | "closing"
    | "draft"
    | "opened"
    | "planning"
    | "running"
    | "validating";
  title: string;
};

export type MissionCheckpointSummary = {
  label: string;
  ownerAgent: string;
  sessionId: string;
  status: "blocked" | "failed" | "passed" | "pending";
};

export type MissionCostSummary = {
  modelCallCount: number;
  totalUsd: number;
};

export type MissionGitSummary = {
  activeBranches: string[];
  workspaceCount: number;
};

export type MissionSkillSummary = {
  activeSourceCount: number;
  discoveredSkillCount: number;
  sourceCount: number;
};

export type MissionEvidenceSummary = {
  checkpointId: string;
  command: string;
  createdAt: string;
  evidenceId: string;
  exitCode: number;
};

export type WorkspaceAgent = {
  id: string;
  model: string;
  name: string;
  role: string;
  status: "active" | "queued" | "reviewing";
  tools: string[];
};

export type WorkspaceCheckpoint = {
  label: string;
  state: "done" | "queued" | "running";
};

export type WorkspaceRecord = {
  activeAgentId: string;
  agents: WorkspaceAgent[];
  branch: string;
  budgetLimitUsd: number;
  budgetUsedUsd: number;
  checkpoints: WorkspaceCheckpoint[];
  id: string;
  logs: string[];
  mission: string;
  name: string;
  path: string;
  selectedAgentTemplateId?: string | null;
  selectedHarnessProfileId?: string | null;
  skills: string[];
  gitStatus?: WorkspaceGitStatus;
  status: "configured" | "observing" | "running";
};

export type WorkspaceGitStatus = {
  aheadCount: number;
  behindCount: number;
  branch: string;
  hasUntracked: boolean;
  isDirty: boolean;
  lastError?: string | null;
  lastRefreshedAt?: string | null;
  remoteBranch?: string | null;
};

export type WorkspaceSnapshot = {
  workspaces: WorkspaceRecord[];
};

export type CreateWorkspaceRequest = {
  branch: string;
  id: string;
  mission: string;
  name: string;
  path: string;
};

export type UpdateWorkspaceGitContextRequest = {
  branch: string;
  path: string;
  workspaceId: string;
};

export type UpdateWorkspaceLoadoutRequest = {
  agentTemplateId?: string | null;
  harnessProfileId?: string | null;
  workspaceId: string;
};

export type RefreshWorkspaceGitStatusRequest = {
  workspaceId: string;
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

export type RecordModelCallEstimateRequest = {
  agentId: string;
  cachedTokens: number;
  estimatedCostUsd: number;
  inputTokens: number;
  model: string;
  outputTokens: number;
  provider: string;
};

export type RegisterGitHubSkillSourceRequest = {
  id: string;
  repositoryUrl: string;
  selectedRef: string;
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
  activePiExtensionCount?: number;
  activeProfileCount: number;
  bindings: HarnessBinding[];
  effectiveHarnesses?: EffectiveHarnessPreview[];
  piExtensions?: PiExtension[];
  profiles: HarnessProfile[];
};

export type EffectiveHarnessPreview = {
  enabledModuleCount: number;
  piExtensionCount?: number;
  preview: string;
  profileId: string;
  profileName: string;
  skillRouteCount: number;
};

export type PiExtension = {
  active: boolean;
  description: string;
  id: string;
  inspected: boolean;
  modules: HarnessModule[];
  name: string;
  route: string;
};

export type CreateHarnessProfileRequest = {
  active: boolean;
  basePolicy: string;
  description: string;
  id: string;
  name: string;
  skillRoutes: string[];
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
  skillRoutes: string[];
};

export type ImportPiExtensionRequest = {
  agentPersona?: string | null;
  basePolicy: string;
  behaviorRules: string[];
  description: string;
  id: string;
  name: string;
  outputStyle?: string | null;
  projectMemory?: string | null;
  safetyRules: string[];
  toolRules: string[];
};

export type SetPiExtensionActiveRequest = {
  active: boolean;
  extensionId: string;
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

export type AgentEvaluationStatus = "pending" | "running" | "passed" | "failed" | "regressed";

export type AgentEvaluationRun = {
  agentTemplateId: string;
  artifactPath?: string | null;
  baselineVersion: number;
  candidateVersion: number;
  estimatedCostCents: number;
  id: string;
  regressionCount: number;
  score?: number | null;
  status: AgentEvaluationStatus;
  suiteId: string;
};

export type AgentStudioSnapshot = {
  activeTemplateCount: number;
  evaluationRuns?: AgentEvaluationRun[];
  templates: AgentTemplate[];
  trainingRuns: AgentTrainingRun[];
  versionSummaries?: AgentVersionSummary[];
};

export type AgentVersionSummary = {
  active: boolean;
  currentVersion: number;
  latestTrainingStatus?: AgentTrainingStatus | null;
  promotedTrainingCount: number;
  templateId: string;
  templateName: string;
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

export type PromoteAgentTrainingRunRequest = {
  trainingRunId: string;
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
  availableModels?: AiModelRecord[];
  displayName: string;
  modelSyncError?: string | null;
  modelSyncStatus?: ProviderModelSyncStatus;
  modelsLastSyncedAt?: string | null;
  providerId: string;
  selectedModelId: string;
};

export type ProviderModelSyncStatus = "never_synced" | "synced" | "failed";

export type AiModelRecord = {
  id: string;
  label: string;
  providerId: string;
};

export type SettingsSnapshot = {
  aiProvider: AiProviderSettings;
};

export type UpdateAiProviderSettingsRequest = {
  apiKey?: string | null;
  providerId: string;
  selectedModelId: string;
};

export type SyncProviderModelsRequest = {
  apiKey?: string | null;
  providerId: string;
};

export type ElectronCommandMap = {
  approve_skill_source_permissions: unknown;
  agent_studio_snapshot: AgentStudioSnapshot;
  create_agent_template: AgentStudioSnapshot;
  create_harness_profile: HarnessStudioSnapshot;
  create_workspace: WorkspaceSnapshot;
  harness_studio_snapshot: HarnessStudioSnapshot;
  import_pi_extension: HarnessStudioSnapshot;
  inspect_cached_skill_source: unknown;
  mission_control_snapshot: MissionControlSnapshot;
  promote_agent_training_run: AgentStudioSnapshot;
  record_model_call_estimate: MissionControlSnapshot;
  refresh_workspace_git_status: WorkspaceSnapshot;
  register_github_skill_source: unknown;
  settings_snapshot: SettingsSnapshot;
  set_agent_template_active: AgentStudioSnapshot;
  set_harness_profile_active: HarnessStudioSnapshot;
  set_pi_extension_active: HarnessStudioSnapshot;
  skill_sources_snapshot: SkillSourcesSnapshot;
  activate_skill_source: unknown;
  sync_github_skill_source: unknown;
  sync_provider_models: SettingsSnapshot;
  update_agent_template: AgentStudioSnapshot;
  update_ai_provider_settings: SettingsSnapshot;
  update_harness_profile: HarnessStudioSnapshot;
  update_workspace_git_context: WorkspaceSnapshot;
  update_workspace_loadout: WorkspaceSnapshot;
  workspace_snapshot: WorkspaceSnapshot;
};
