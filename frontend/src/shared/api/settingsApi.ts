import type { SettingsSnapshot, SyncProviderModelsRequest, UpdateAiProviderSettingsRequest } from "../types/core";

export type SettingsCommand = "settings_snapshot" | "sync_provider_models" | "update_ai_provider_settings";

export type InvokeSettings = (
  command: SettingsCommand,
  args?: Record<string, unknown>
) => Promise<SettingsSnapshot>;

export async function loadSettingsSnapshot(invoke: InvokeSettings): Promise<SettingsSnapshot> {
  return invoke("settings_snapshot");
}

export async function updateAiProviderSettings(
  invoke: InvokeSettings,
  request: UpdateAiProviderSettingsRequest
): Promise<SettingsSnapshot> {
  return invoke("update_ai_provider_settings", { request });
}

export async function syncProviderModels(
  invoke: InvokeSettings,
  request: SyncProviderModelsRequest
): Promise<SettingsSnapshot> {
  return invoke("sync_provider_models", { request });
}
