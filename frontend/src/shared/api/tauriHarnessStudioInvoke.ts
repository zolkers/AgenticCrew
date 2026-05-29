import { invoke } from "@tauri-apps/api/core";
import type { HarnessStudioSnapshot } from "../types/core";
import type { InvokeHarnessStudio } from "./harnessStudioApi";

export const tauriHarnessStudioInvoke: InvokeHarnessStudio = (command, args) =>
  invoke<HarnessStudioSnapshot>(command, args);
