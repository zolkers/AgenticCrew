import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

if (rootElement !== null) {
  const agentStudioInvoke = isElectronRuntime
    ? electronAgentStudioInvoke
    : isTauriRuntime
      ? tauriAgentStudioInvoke
      : previewAgentStudioInvoke;
  const harnessStudioInvoke = isElectronRuntime
    ? electronHarnessStudioInvoke
    : isTauriRuntime
      ? tauriHarnessStudioInvoke
      : previewHarnessStudioInvoke;
  const missionControlInvoke = isElectronRuntime
    ? electronMissionControlInvoke
    : isTauriRuntime
      ? tauriMissionControlInvoke
      : previewMissionControlInvoke;
  const skillSourcesInvoke = isElectronRuntime
    ? electronSkillSourcesInvoke
    : isTauriRuntime
      ? tauriSkillSourcesInvoke
      : previewSkillSourcesInvoke;

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
