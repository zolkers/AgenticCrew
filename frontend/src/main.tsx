import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
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
const isTauriRuntime = "__TAURI_INTERNALS__" in window;

if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App
        agentStudioInvoke={isTauriRuntime ? tauriAgentStudioInvoke : previewAgentStudioInvoke}
        harnessStudioInvoke={isTauriRuntime ? tauriHarnessStudioInvoke : previewHarnessStudioInvoke}
        missionControlInvoke={isTauriRuntime ? tauriMissionControlInvoke : previewMissionControlInvoke}
        skillSourcesInvoke={isTauriRuntime ? tauriSkillSourcesInvoke : previewSkillSourcesInvoke}
      />
    </StrictMode>
  );
}
