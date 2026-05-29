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
      gitStatus: {
        aheadCount: 2,
        behindCount: 1,
        branch: "codex/settings",
        hasUntracked: true,
        isDirty: true,
        lastError: null,
        lastRefreshedAt: "2026-05-29T12:00:00Z",
        remoteBranch: "origin/codex/settings"
      },
      gitHistory: [
        {
          author: "Codex",
          branch: "codex/settings",
          hash: "abc1234",
          message: "feat(settings): wire provider panel",
          relativeTime: "5 minutes ago"
        }
      ],
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
      skills: [],
      status: "running"
    };

    render(<GitPanel branchOptions={["main", "codex/settings"]} onRefreshGitStatus={vi.fn()} onWorkspaceChange={vi.fn()} workspace={workspace} />);

    expect(screen.getByRole("heading", { name: "Git Panel" })).toBeInTheDocument();
    expect(screen.getAllByText("codex/settings").length).toBeGreaterThan(0);
    expect(screen.queryByText("C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew")).not.toBeInTheDocument();
    expect(screen.getByText("Working tree dirty")).toBeInTheDocument();
    expect(screen.getByText("origin/codex/settings")).toBeInTheDocument();
    expect(screen.getAllByText("2 ahead / 1 behind").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-05-29T12:00:00Z")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Commit message")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText("feat(settings): wire provider panel")).toBeInTheDocument();
    expect(screen.getByText("abc1234 · Codex · 5 minutes ago")).toBeInTheDocument();
  });

  it("submits selected branch while preserving the internal workspace path", () => {
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

    render(
      <GitPanel
        branchOptions={["main", "codex/settings", "feature/new-shell"]}
        onRefreshGitStatus={vi.fn()}
        onWorkspaceChange={onWorkspaceChange}
        workspace={workspace}
      />
    );

    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "feature/new-shell" } });
    expect(screen.queryByLabelText("Workspace path")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save branch" }));

    expect(onWorkspaceChange).toHaveBeenCalledWith({
      branch: "feature/new-shell",
      path: "C:\\repo\\AgenticCrew"
    });
  });

  it("requests a git status refresh", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
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
    const onRefreshGitStatus = vi.fn();

    render(<GitPanel branchOptions={["main", "dev"]} onRefreshGitStatus={onRefreshGitStatus} onWorkspaceChange={vi.fn()} workspace={workspace} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onRefreshGitStatus).toHaveBeenCalledOnce();
  });

  it("requires a commit message before preparing a commit", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      gitStatus: {
        aheadCount: 0,
        behindCount: 0,
        branch: "dev",
        hasUntracked: false,
        isDirty: true,
        lastError: null,
        lastRefreshedAt: "now",
        remoteBranch: "origin/dev"
      },
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };

    render(<GitPanel branchOptions={["main", "dev"]} onRefreshGitStatus={vi.fn()} onWorkspaceChange={vi.fn()} workspace={workspace} />);
    expect(screen.getByRole("button", { name: "Commit" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Commit message"), {
      target: { value: "style(git): add commit composer" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Commit" }));

    expect(screen.getByText("Commit prepared: style(git): add commit composer")).toBeInTheDocument();
  });

  it("keeps commit actions disabled when the workspace is clean", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      gitStatus: {
        aheadCount: 0,
        behindCount: 0,
        branch: "dev",
        hasUntracked: false,
        isDirty: false,
        lastError: null,
        lastRefreshedAt: "now",
        remoteBranch: "origin/dev"
      },
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };

    render(<GitPanel branchOptions={["main", "dev"]} onRefreshGitStatus={vi.fn()} onWorkspaceChange={vi.fn()} workspace={workspace} />);
    fireEvent.change(screen.getByLabelText("Commit message"), {
      target: { value: "style(git): add commit composer" }
    });

    expect(screen.getByRole("button", { name: "Commit" })).toBeDisabled();
    expect(screen.getByText("No local changes detected")).toBeInTheDocument();
  });

  it("resyncs editable git context when the workspace changes", () => {
    const firstWorkspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
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
    const secondWorkspace: CockpitWorkspace = {
      ...firstWorkspace,
      branch: "release",
      id: "release-workspace",
      path: "D:\\release\\AgenticCrew"
    };
    const onWorkspaceChange = vi.fn();
    const { rerender } = render(
      <GitPanel
        branchOptions={["dev", "release"]}
        onRefreshGitStatus={vi.fn()}
        onWorkspaceChange={onWorkspaceChange}
        workspace={firstWorkspace}
      />
    );

    rerender(
      <GitPanel
        branchOptions={["dev", "release"]}
        onRefreshGitStatus={vi.fn()}
        onWorkspaceChange={onWorkspaceChange}
        workspace={secondWorkspace}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Save branch" }));

    expect(onWorkspaceChange).toHaveBeenCalledWith({
      branch: "release",
      path: "D:\\release\\AgenticCrew"
    });
  });
});
