import type { SettingsSnapshot, UpdateAiProviderSettingsRequest } from "../types/core";

export type SettingsCommand = "settings_snapshot" | "update_ai_provider_settings";

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
