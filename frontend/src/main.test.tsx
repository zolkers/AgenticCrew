import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app/App";
import { tauriMissionControlInvoke } from "./shared/api/tauriMissionControlInvoke";

const mocks = vi.hoisted(() => ({
  app: vi.fn(() => null),
  createRoot: vi.fn(),
  render: vi.fn(),
  tauriMissionControlInvoke: vi.fn()
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

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRoot.mockReturnValue({ render: mocks.render });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders App with the Tauri Mission Control command when the root exists", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mocks.render).toHaveBeenCalledTimes(1);

    const renderedElement = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{ missionControlInvoke: unknown }>;
    }>;
    expect(renderedElement.type).toBe(StrictMode);
    expect(renderedElement.props.children.type).toBe(App);
    expect(renderedElement.props.children.props.missionControlInvoke).toBe(tauriMissionControlInvoke);
  });

  it("does not render when the root is absent", async () => {
    await import("./main");

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
