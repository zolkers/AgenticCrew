import { invoke } from "@tauri-apps/api/core";
import type { SettingsSnapshot } from "../types/core";
import type { InvokeSettings } from "./settingsApi";

export const tauriSettingsInvoke: InvokeSettings = (command, args) =>
  invoke<SettingsSnapshot>(command, args);
