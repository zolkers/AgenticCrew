import type { ApprovedPermissionPolicy, SkillSourcesSnapshot } from "../types/core";

export type SkillSourcesCommand = "skill_sources_snapshot" | "approve_skill_source_permissions";

export type InvokeSkillSources = (
  command: SkillSourcesCommand,
  args?: { policy: ApprovedPermissionPolicy; sourceId: string }
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
