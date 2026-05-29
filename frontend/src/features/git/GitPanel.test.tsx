import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitPanel } from "./GitPanel";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";

afterEach(() => {
  cleanup();
});

describe("GitPanel", () => {
  it("renders workspace git context", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "codex/settings",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
      skills: [],
      status: "running"
    };

    render(<GitPanel onWorkspaceChange={vi.fn()} workspace={workspace} />);

    expect(screen.getByRole("heading", { name: "Git Panel" })).toBeInTheDocument();
    expect(screen.getAllByText("codex/settings").length).toBeGreaterThan(0);
    expect(screen.getByText("C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew")).toBeInTheDocument();
    expect(screen.getByText("PR workflow ready")).toBeInTheDocument();
  });

  it("submits manual branch and workspace path edits", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "codex/settings",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };
    const onWorkspaceChange = vi.fn();

    render(<GitPanel onWorkspaceChange={onWorkspaceChange} workspace={workspace} />);

    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "feature/new-shell" } });
    fireEvent.change(screen.getByLabelText("Workspace path"), { target: { value: "D:\\work\\AgenticCrew" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Git context" }));

    expect(onWorkspaceChange).toHaveBeenCalledWith({
      branch: "feature/new-shell",
      path: "D:\\work\\AgenticCrew"
    });
  });
});
