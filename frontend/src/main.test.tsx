import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app/App";
import { previewMissionControlInvoke, previewSkillSourcesInvoke } from "./shared/api/previewInvokes";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";
import { tauriSkillSourcesInvoke } from "./shared/api/tauriSkillSourcesInvoke";

const mocks = vi.hoisted(() => ({
  app: vi.fn(() => null),
  createRoot: vi.fn(),
  previewMissionControlInvoke: vi.fn(),
  previewSkillSourcesInvoke: vi.fn(),
  render: vi.fn(),
  tauriMissionControlInvoke: vi.fn(),
  tauriSkillSourcesInvoke: vi.fn()
}));

vi.mock("react-dom/client", () => ({
  createRoot: mocks.createRoot
}));

vi.mock("./app/App", () => ({
  App: mocks.app
}));

vi.mock("./shared/api/tauriMissionControlInvoke", () => ({
  tauriMissionControlInvoke: mocks.tauriMissionControlInvoke
}));

vi.mock("./shared/api/tauriSkillSourcesInvoke", () => ({
  tauriSkillSourcesInvoke: mocks.tauriSkillSourcesInvoke
}));

vi.mock("./shared/api/previewInvokes", () => ({
  previewMissionControlInvoke: mocks.previewMissionControlInvoke,
  previewSkillSourcesInvoke: mocks.previewSkillSourcesInvoke
}));

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRoot.mockReturnValue({ render: mocks.render });
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders App with preview commands outside the Tauri runtime", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mocks.render).toHaveBeenCalledTimes(1);

    const renderedElement = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{ missionControlInvoke: unknown; skillSourcesInvoke: unknown }>;
    }>;
    expect(renderedElement.type).toBe(StrictMode);
    expect(renderedElement.props.children.type).toBe(App);
    expect(renderedElement.props.children.props.missionControlInvoke).toBe(previewMissionControlInvoke);
    expect(renderedElement.props.children.props.skillSourcesInvoke).toBe(previewSkillSourcesInvoke);
  });

  it("renders App with the Tauri commands inside the Tauri runtime", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {}
    });

    await import("./main");

    const renderedElement = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{ missionControlInvoke: unknown; skillSourcesInvoke: unknown }>;
    }>;

    expect(renderedElement.props.children.props.missionControlInvoke).toBe(tauriMissionControlInvoke);
    expect(renderedElement.props.children.props.skillSourcesInvoke).toBe(tauriSkillSourcesInvoke);
  });

  it("does not render when the root is absent", async () => {
    await import("./main");

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
