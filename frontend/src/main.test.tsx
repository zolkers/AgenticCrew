import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app/App";
import {
  electronAgentStudioInvoke,
  electronCommitPreviewInvoke,
  electronHarnessStudioInvoke,
  electronMissionControlInvoke,
  electronRunsInvoke,
  electronSettingsInvoke,
  electronSkillSourcesInvoke,
  electronWorkspaceInvoke
} from "./shared/api/electronInvokes";
import {
  previewAgentStudioInvoke,
  previewCommitPreviewInvoke,
  previewHarnessStudioInvoke,
  previewMissionControlInvoke,
  previewRunsInvoke,
  previewSettingsInvoke,
  previewSkillSourcesInvoke,
  previewWorkspaceInvoke
} from "./shared/api/previewInvokes";

const mocks = vi.hoisted(() => ({
  app: vi.fn(() => null),
  createRoot: vi.fn(),
  electronAgentStudioInvoke: vi.fn(),
  electronCommitPreviewInvoke: vi.fn(),
  electronHarnessStudioInvoke: vi.fn(),
  electronMissionControlInvoke: vi.fn(),
  electronRunsInvoke: vi.fn(),
  electronSettingsInvoke: vi.fn(),
  electronSkillSourcesInvoke: vi.fn(),
  electronWorkspaceInvoke: vi.fn(),
  previewAgentStudioInvoke: vi.fn(),
  previewCommitPreviewInvoke: vi.fn(),
  previewHarnessStudioInvoke: vi.fn(),
  previewMissionControlInvoke: vi.fn(),
  previewRunsInvoke: vi.fn(),
  previewSettingsInvoke: vi.fn(),
  previewSkillSourcesInvoke: vi.fn(),
  previewWorkspaceInvoke: vi.fn(),
  render: vi.fn()
}));

vi.mock("react-dom/client", () => ({
  createRoot: mocks.createRoot
}));

vi.mock("./app/App", () => ({
  App: mocks.app
}));

vi.mock("./shared/api/electronInvokes", () => ({
  electronAgentStudioInvoke: mocks.electronAgentStudioInvoke,
  electronCommitPreviewInvoke: mocks.electronCommitPreviewInvoke,
  electronHarnessStudioInvoke: mocks.electronHarnessStudioInvoke,
  electronMissionControlInvoke: mocks.electronMissionControlInvoke,
  electronRunsInvoke: mocks.electronRunsInvoke,
  electronSettingsInvoke: mocks.electronSettingsInvoke,
  electronSkillSourcesInvoke: mocks.electronSkillSourcesInvoke,
  electronWorkspaceInvoke: mocks.electronWorkspaceInvoke
}));

vi.mock("./shared/api/previewInvokes", () => ({
  previewAgentStudioInvoke: mocks.previewAgentStudioInvoke,
  previewCommitPreviewInvoke: mocks.previewCommitPreviewInvoke,
  previewHarnessStudioInvoke: mocks.previewHarnessStudioInvoke,
  previewMissionControlInvoke: mocks.previewMissionControlInvoke,
  previewRunsInvoke: mocks.previewRunsInvoke,
  previewSettingsInvoke: mocks.previewSettingsInvoke,
  previewSkillSourcesInvoke: mocks.previewSkillSourcesInvoke,
  previewWorkspaceInvoke: mocks.previewWorkspaceInvoke
}));

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRoot.mockReturnValue({ render: mocks.render });
    Reflect.deleteProperty(window, "agenticcrew");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    Reflect.deleteProperty(window, "agenticcrew");
    vi.clearAllMocks();
  });

  it("renders App with preview commands outside the Electron runtime", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mocks.render).toHaveBeenCalledTimes(1);

    const renderedElement = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{
        agentStudioInvoke: unknown;
        commitPreviewInvoke: unknown;
        harnessStudioInvoke: unknown;
        missionControlInvoke: unknown;
        runsInvoke: unknown;
        settingsInvoke: unknown;
        skillSourcesInvoke: unknown;
        workspaceInvoke: unknown;
      }>;
    }>;
    expect(renderedElement.type).toBe(StrictMode);
    expect(renderedElement.props.children.type).toBe(App);
    expect(renderedElement.props.children.props.agentStudioInvoke).toBe(previewAgentStudioInvoke);
    expect(renderedElement.props.children.props.commitPreviewInvoke).toBe(previewCommitPreviewInvoke);
    expect(renderedElement.props.children.props.harnessStudioInvoke).toBe(previewHarnessStudioInvoke);
    expect(renderedElement.props.children.props.missionControlInvoke).toBe(previewMissionControlInvoke);
    expect(renderedElement.props.children.props.runsInvoke).toBe(previewRunsInvoke);
    expect(renderedElement.props.children.props.settingsInvoke).toBe(previewSettingsInvoke);
    expect(renderedElement.props.children.props.skillSourcesInvoke).toBe(previewSkillSourcesInvoke);
    expect(renderedElement.props.children.props.workspaceInvoke).toBe(previewWorkspaceInvoke);
  });

  it("renders App with Electron commands when the Electron bridge is present", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    Object.defineProperty(window, "agenticcrew", {
      configurable: true,
      value: { invoke: vi.fn() }
    });

    await import("./main");

    const renderedElement = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{
        agentStudioInvoke: unknown;
        commitPreviewInvoke: unknown;
        harnessStudioInvoke: unknown;
        missionControlInvoke: unknown;
        runsInvoke: unknown;
        settingsInvoke: unknown;
        skillSourcesInvoke: unknown;
        workspaceInvoke: unknown;
      }>;
    }>;

    expect(renderedElement.props.children.props.agentStudioInvoke).toBe(electronAgentStudioInvoke);
    expect(renderedElement.props.children.props.commitPreviewInvoke).toBe(electronCommitPreviewInvoke);
    expect(renderedElement.props.children.props.harnessStudioInvoke).toBe(electronHarnessStudioInvoke);
    expect(renderedElement.props.children.props.missionControlInvoke).toBe(electronMissionControlInvoke);
    expect(renderedElement.props.children.props.runsInvoke).toBe(electronRunsInvoke);
    expect(renderedElement.props.children.props.settingsInvoke).toBe(electronSettingsInvoke);
    expect(renderedElement.props.children.props.skillSourcesInvoke).toBe(electronSkillSourcesInvoke);
    expect(renderedElement.props.children.props.workspaceInvoke).toBe(electronWorkspaceInvoke);
  });

  it("does not render when the root is absent", async () => {
    await import("./main");

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
