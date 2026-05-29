import type { ElectronCommandMap } from "../types/core";
import type { InvokeAgentStudio } from "./agentStudioApi";
import type { InvokeHarnessStudio } from "./harnessStudioApi";
import type { InvokeMissionControl } from "./missionControlApi";
import type { InvokeSettings } from "./settingsApi";
import type { InvokeSkillSources } from "./skillSourcesApi";
import type { InvokeWorkspace } from "./workspaceApi";

function invokeElectron<Command extends keyof ElectronCommandMap>(
  command: Command,
  args?: Record<string, unknown>
): Promise<ElectronCommandMap[Command]> {
  if (typeof window.agenticcrew?.invoke !== "function") {
    return Promise.reject(new Error("AgenticCrew Electron bridge unavailable"));
  }

  return window.agenticcrew.invoke(command, args);
}

export const electronAgentStudioInvoke: InvokeAgentStudio = (command, args) =>
  invokeElectron(command, args);

export const electronHarnessStudioInvoke: InvokeHarnessStudio = (command, args) =>
  invokeElectron(command, args);

export const electronMissionControlInvoke: InvokeMissionControl = (command, args) =>
  invokeElectron(command, args);

export const electronWorkspaceInvoke: InvokeWorkspace = (command, args) =>
  invokeElectron(command, args);

export const electronSkillSourcesInvoke: InvokeSkillSources = (command, args) =>
  invokeElectron(command, args);

export const electronSettingsInvoke: InvokeSettings = (command, args) =>
  invokeElectron(command, args);
