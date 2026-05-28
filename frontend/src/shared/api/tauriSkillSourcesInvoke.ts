import { invoke } from "@tauri-apps/api/core";
import type { SkillSourcesSnapshot } from "../types/core";
import type { InvokeSkillSources } from "./skillSourcesApi";

export const tauriSkillSourcesInvoke: InvokeSkillSources = (command) => invoke<SkillSourcesSnapshot>(command);
