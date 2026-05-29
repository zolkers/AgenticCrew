import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import { App } from "./app/App";
import {
  electronAgentStudioInvoke,
  electronHarnessStudioInvoke,
  electronMissionControlInvoke,
  electronSkillSourcesInvoke
} from "./shared/api/electronInvokes";
import {
  previewAgentStudioInvoke,
  previewHarnessStudioInvoke,
  previewMissionControlInvoke,
  previewSkillSourcesInvoke
} from "./shared/api/previewInvokes";
import { tauriAgentStudioInvoke } from "./shared/api/tauriAgentStudioInvoke";
import { tauriHarnessStudioInvoke } from "./shared/api/tauriHarnessStudioInvoke";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";
import { tauriSkillSourcesInvoke } from "./shared/api/tauriSkillSourcesInvoke";

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

  createRoot(rootElement).render(
    <StrictMode>
      <App
        agentStudioInvoke={agentStudioInvoke}
        harnessStudioInvoke={harnessStudioInvoke}
        missionControlInvoke={missionControlInvoke}
        skillSourcesInvoke={skillSourcesInvoke}
      />
    </StrictMode>
  );
}
