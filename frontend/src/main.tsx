import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import { App } from "./app/App";
import {
  electronAgentStudioInvoke,
  electronHarnessStudioInvoke,
  electronCommitPreviewInvoke,
  electronMissionControlInvoke,
  electronRunsInvoke,
  electronSettingsInvoke,
  electronSkillSourcesInvoke,
  electronWorkspaceInvoke
} from "./shared/api/electronInvokes";
import {
  previewAgentStudioInvoke,
  previewHarnessStudioInvoke,
  previewCommitPreviewInvoke,
  previewMissionControlInvoke,
  previewRunsInvoke,
  previewSettingsInvoke,
  previewSkillSourcesInvoke,
  previewWorkspaceInvoke
} from "./shared/api/previewInvokes";

const rootElement = document.getElementById("root");
const isElectronRuntime = typeof window.agenticcrew?.invoke === "function";

function selectDesktopInvoke<T>(electronInvoke: T, previewInvoke: T): T {
  return isElectronRuntime ? electronInvoke : previewInvoke;
}

if (rootElement !== null) {
  const agentStudioInvoke = selectDesktopInvoke(
    electronAgentStudioInvoke,
    previewAgentStudioInvoke
  );
  const harnessStudioInvoke = selectDesktopInvoke(
    electronHarnessStudioInvoke,
    previewHarnessStudioInvoke
  );
  const missionControlInvoke = selectDesktopInvoke(
    electronMissionControlInvoke,
    previewMissionControlInvoke
  );
  const skillSourcesInvoke = selectDesktopInvoke(
    electronSkillSourcesInvoke,
    previewSkillSourcesInvoke
  );
  const workspaceInvoke = selectDesktopInvoke(
    electronWorkspaceInvoke,
    previewWorkspaceInvoke
  );
  const commitPreviewInvoke = selectDesktopInvoke(
    electronCommitPreviewInvoke,
    previewCommitPreviewInvoke
  );
  const runsInvoke = selectDesktopInvoke(electronRunsInvoke, previewRunsInvoke);
  const settingsInvoke = selectDesktopInvoke(
    electronSettingsInvoke,
    previewSettingsInvoke
  );

  createRoot(rootElement).render(
    <StrictMode>
      <App
        agentStudioInvoke={agentStudioInvoke}
        harnessStudioInvoke={harnessStudioInvoke}
        missionControlInvoke={missionControlInvoke}
        commitPreviewInvoke={commitPreviewInvoke}
        settingsInvoke={settingsInvoke}
        runsInvoke={runsInvoke}
        skillSourcesInvoke={skillSourcesInvoke}
        workspaceInvoke={workspaceInvoke}
      />
    </StrictMode>
  );
}
