import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";
import { tauriSkillSourcesInvoke } from "./shared/api/tauriSkillSourcesInvoke";

const rootElement = document.getElementById("root");

if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App missionControlInvoke={tauriMissionControlInvoke} skillSourcesInvoke={tauriSkillSourcesInvoke} />
    </StrictMode>
  );
}
