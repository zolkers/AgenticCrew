import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { previewMissionControlInvoke, previewSkillSourcesInvoke } from "./shared/api/previewInvokes";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";
import { tauriSkillSourcesInvoke } from "./shared/api/tauriSkillSourcesInvoke";

const rootElement = document.getElementById("root");
const isTauriRuntime = "__TAURI_INTERNALS__" in window;

if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App
        missionControlInvoke={isTauriRuntime ? tauriMissionControlInvoke : previewMissionControlInvoke}
        skillSourcesInvoke={isTauriRuntime ? tauriSkillSourcesInvoke : previewSkillSourcesInvoke}
      />
    </StrictMode>
  );
}
