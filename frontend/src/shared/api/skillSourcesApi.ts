import type { ApprovedPermissionPolicy, SkillSourcesSnapshot } from "../types/core";

export type SkillSourcesCommand =
  | "skill_sources_snapshot"
  | "approve_skill_source_permissions"
  | "inspect_cached_skill_source"
  | "sync_github_skill_source";

export type InvokeSkillSources = (
  command: SkillSourcesCommand,
  args?: { policy: ApprovedPermissionPolicy; sourceId: string } | { sourceId: string }
) => Promise<unknown>;

export async function loadSkillSourcesSnapshot(invoke: InvokeSkillSources): Promise<SkillSourcesSnapshot> {
  return (await invoke("skill_sources_snapshot")) as SkillSourcesSnapshot;
}

export async function approveSkillSourcePermissions(
  invoke: InvokeSkillSources,
  sourceId: string,
  policy: ApprovedPermissionPolicy
): Promise<void> {
  await invoke("approve_skill_source_permissions", { policy, sourceId });
}

export async function syncGitHubSkillSource(invoke: InvokeSkillSources, sourceId: string): Promise<void> {
  await invoke("sync_github_skill_source", { sourceId });
}

export async function inspectCachedSkillSource(invoke: InvokeSkillSources, sourceId: string): Promise<void> {
  await invoke("inspect_cached_skill_source", { sourceId });
}
