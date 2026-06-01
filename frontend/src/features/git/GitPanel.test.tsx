import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitPanel } from "./GitPanel";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";
import type { CommitPreviewResponse } from "../../shared/types/core";

afterEach(() => {
  cleanup();
});

describe("GitPanel", () => {
  const commitPreview: CommitPreviewResponse = {
    commitHash: "abc1234",
    files: [
      {
        additions: 42,
        category: "source",
        deletions: 9,
        diffLines: [
          { content: "@@ src/features/settings/SettingsPanel.tsx", kind: "hunk" },
          { content: "+ render selected commit details", kind: "addition" },
          { content: "- static history row", kind: "deletion" }
        ],
        path: "src/features/settings/SettingsPanel.tsx",
        status: "modified"
      },
      {
        additions: 18,
        category: "test",
        deletions: 2,
        diffLines: [
          { content: "@@ tests", kind: "hunk" },
          { content: "+ opens commit preview", kind: "addition" }
        ],
        path: "frontend/src/app/App.test.tsx",
        status: "modified"
      },
      {
        additions: 7,
        category: "docs",
        deletions: 1,
        diffLines: [
          { content: "@@ docs", kind: "hunk" },
          { content: "+ document Git preview flow", kind: "addition" }
        ],
        path: "docs/roadmap.md",
        status: "modified"
      }
    ],
    metadata: {
      authoredAt: "2026-05-29T12:00:00Z",
      authorEmail: "codex@example.com",
      authorName: "Codex",
      body: "",
      hash: "abc1234",
      shortHash: "abc1234",
      subject: "feat(settings): wire provider panel"
    },
    workspaceId: "settings-workspace"
  };

  const renderGitPanel = (
    workspace: CockpitWorkspace,
    options: Partial<Parameters<typeof GitPanel>[0]> = {}
  ) =>
    render(
      <GitPanel
        branchOptions={["main", workspace.branch]}
        commitPreviewInvoke={vi.fn(() => Promise.resolve(commitPreview))}
        onRefreshGitStatus={vi.fn()}
        onWorkspaceChange={vi.fn()}
        workspace={workspace}
        {...options}
      />
    );

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

    renderGitPanel(workspace, { branchOptions: ["main", "codex/settings"] });

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
    expect(screen.getAllByText("feat(settings): wire provider panel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("abc1234 · Codex · 5 minutes ago").length).toBeGreaterThan(0);
  });

  it("opens an interactive backend history preview with filters and file details", async () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "codex/settings",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
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
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };

    const commitPreviewInvoke = vi.fn(() => Promise.resolve(commitPreview));

    renderGitPanel(workspace, { branchOptions: ["main", "codex/settings"], commitPreviewInvoke });
    fireEvent.click(screen.getByRole("button", { name: /Preview feat\(settings\): wire provider panel/u }));

    expect(screen.getByRole("heading", { name: "Commit preview" })).toBeInTheDocument();
    await waitFor(() => {
      expect(commitPreviewInvoke).toHaveBeenCalledWith("commit_preview", {
        request: {
          commitHash: "abc1234",
          workspaceId: "settings-workspace"
        }
      });
    });
    expect(screen.getByLabelText("Commit file statistics")).toHaveTextContent("codex/settings");
    expect(screen.getByRole("button", { name: "Copy hash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create branch from here" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "frontend/src/app/App.test.tsx" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tests" }));

    expect(screen.getByRole("button", { name: "frontend/src/app/App.test.tsx" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "src/features/settings/SettingsPanel.tsx" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search changed files"), { target: { value: "roadmap" } });

    expect(screen.getByText("No files match the current filters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByRole("button", { name: "docs/roadmap.md" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "docs/roadmap.md" }));
    expect(screen.getByLabelText("Selected file diff")).toHaveTextContent("docs/roadmap.md");
  });

  it("surfaces commit preview backend failures", async () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      gitHistory: [
        {
          author: "Codex",
          branch: "dev",
          hash: "badcafe",
          message: "fix(git): inspect failed preview",
          relativeTime: "now"
        }
      ],
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };

    renderGitPanel(workspace, {
      branchOptions: ["dev"],
      commitPreviewInvoke: vi.fn(() => Promise.reject(new Error("git show failed")))
    });

    expect(await screen.findByText("git show failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Commit file statistics")).toHaveTextContent("0");
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

    renderGitPanel(workspace, {
      branchOptions: ["main", "codex/settings", "feature/new-shell"],
      onWorkspaceChange
    });

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

    renderGitPanel(workspace, { branchOptions: ["main", "dev"], onRefreshGitStatus });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onRefreshGitStatus).toHaveBeenCalledOnce();
  });

  it("renders the empty history preview state", () => {
    const workspace: CockpitWorkspace = {
      activeAgentId: "dev",
      agents: [],
      branch: "dev",
      budgetLimitUsd: 10,
      budgetUsedUsd: 1,
      checkpoints: [],
      gitHistory: [],
      id: "settings-workspace",
      logs: [],
      mission: "Wire settings",
      name: "Settings Workspace",
      path: "C:\\repo\\AgenticCrew",
      skills: [],
      status: "running"
    };

    renderGitPanel(workspace, { branchOptions: ["main", "dev"] });

    expect(screen.getByText("No local history loaded")).toBeInTheDocument();
    expect(screen.getByText("Commit history will appear here once this workspace reports Git log data.")).toBeInTheDocument();
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

    renderGitPanel(workspace, { branchOptions: ["main", "dev"] });
    expect(screen.getByRole("button", { name: "Commit" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Commit message"), {
      target: { value: "style(git): add commit composer" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Commit" }));

    expect(screen.getByText("Commit prepared: style(git): add commit composer")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Commit message"), {
      target: { value: "feat(git): prepare push flow" }
    });
    expect(screen.queryByText("Commit prepared: style(git): add commit composer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Commit & Push" }));

    expect(screen.getByText("Commit and push prepared: feat(git): prepare push flow")).toBeInTheDocument();
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

    renderGitPanel(workspace, { branchOptions: ["main", "dev"] });
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
        commitPreviewInvoke={vi.fn(() => Promise.resolve(commitPreview))}
        onRefreshGitStatus={vi.fn()}
        onWorkspaceChange={onWorkspaceChange}
        workspace={firstWorkspace}
      />
    );

    rerender(
      <GitPanel
        branchOptions={["dev", "release"]}
        commitPreviewInvoke={vi.fn(() => Promise.resolve(commitPreview))}
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
