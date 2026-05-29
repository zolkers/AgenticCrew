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

export type SkillSource = {
  active: boolean;
  id: string;
  kind: SkillSourceKind;
  lastSyncStatus: SkillSourceSyncStatus;
  permissionGate: PermissionGate;
  repositoryUrl: string;
  selectedRef: string;
  status: SkillSourceActivationStatus;
  trustLevel: SkillSourceTrustLevel;
};

export type SkillSourcesSnapshot = {
  activeSourceCount: number;
  sources: SkillSource[];
};
