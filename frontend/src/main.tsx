import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import { App } from "./app/App";
import {
  electronAgentStudioInvoke,
  electronHarnessStudioInvoke,
  electronMissionControlInvoke,
  electronSettingsInvoke,
  electronSkillSourcesInvoke,
  electronWorkspaceInvoke
} from "./shared/api/electronInvokes";
import {
  previewAgentStudioInvoke,
  previewHarnessStudioInvoke,
  previewMissionControlInvoke,
  previewSettingsInvoke,
  previewSkillSourcesInvoke,
  previewWorkspaceInvoke
} from "./shared/api/previewInvokes";
import { tauriAgentStudioInvoke } from "./shared/api/tauriAgentStudioInvoke";
import { tauriHarnessStudioInvoke } from "./shared/api/tauriHarnessStudioInvoke";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";
import { tauriSettingsInvoke } from "./shared/api/tauriSettingsInvoke";
import { tauriSkillSourcesInvoke } from "./shared/api/tauriSkillSourcesInvoke";
import { tauriWorkspaceInvoke } from "./shared/api/tauriWorkspaceInvoke";

const rootElement = document.getElementById("root");
const isElectronRuntime = typeof window.agenticcrew?.invoke === "function";
const isTauriRuntime = "__TAURI_INTERNALS__" in window;

function selectDesktopInvoke<T>(electronInvoke: T, tauriInvoke: T, previewInvoke: T): T {
  if (isElectronRuntime) {
    return electronInvoke;
  }

  if (isTauriRuntime) {
    return tauriInvoke;
  }

  return previewInvoke;
}

if (rootElement !== null) {
  const agentStudioInvoke = selectDesktopInvoke(
    electronAgentStudioInvoke,
    tauriAgentStudioInvoke,
    previewAgentStudioInvoke
  );
  const harnessStudioInvoke = selectDesktopInvoke(
    electronHarnessStudioInvoke,
    tauriHarnessStudioInvoke,
    previewHarnessStudioInvoke
  );
  const missionControlInvoke = selectDesktopInvoke(
    electronMissionControlInvoke,
    tauriMissionControlInvoke,
    previewMissionControlInvoke
  );
  const skillSourcesInvoke = selectDesktopInvoke(
    electronSkillSourcesInvoke,
    tauriSkillSourcesInvoke,
    previewSkillSourcesInvoke
  );
  const workspaceInvoke = selectDesktopInvoke(
    electronWorkspaceInvoke,
    tauriWorkspaceInvoke,
    previewWorkspaceInvoke
  );
  const settingsInvoke = selectDesktopInvoke(
    electronSettingsInvoke,
    tauriSettingsInvoke,
    previewSettingsInvoke
  );

  createRoot(rootElement).render(
    <StrictMode>
      <App
        agentStudioInvoke={agentStudioInvoke}
        harnessStudioInvoke={harnessStudioInvoke}
        missionControlInvoke={missionControlInvoke}
        settingsInvoke={settingsInvoke}
        skillSourcesInvoke={skillSourcesInvoke}
        workspaceInvoke={workspaceInvoke}
      />
    </StrictMode>
  );
}
