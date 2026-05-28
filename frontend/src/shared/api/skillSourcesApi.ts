import type { SkillSourcesSnapshot } from "../types/core";

export type InvokeSkillSources = (command: "skill_sources_snapshot") => Promise<SkillSourcesSnapshot>;

export async function loadSkillSourcesSnapshot(invoke: InvokeSkillSources): Promise<SkillSourcesSnapshot> {
  return invoke("skill_sources_snapshot");
}
