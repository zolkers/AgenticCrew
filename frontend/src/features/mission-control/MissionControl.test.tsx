import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionControl } from "./MissionControl";
import type { MissionControlSnapshot } from "../../shared/types/core";
import "../../i18n";

describe("MissionControl", () => {
  it("renders the provided mission control snapshot", () => {
    const snapshot: MissionControlSnapshot = {
      activeModel: {
        modelId: "gpt-5",
        providerId: "openai"
      },
      activeProvider: {
        displayName: "OpenAI",
        providerId: "openai"
      },
      activeWorkspace: {
        branch: "feature/ui",
        id: "ui-workspace",
        mission: "Modernize Mission Control",
        name: "UI Workspace",
        path: "C:\\agentos",
        status: "running"
      },
      activeAgentCount: 4,
      activeSessionCount: 2,
      checkpoints: [
        {
          label: "Architecture boundary",
          ownerAgent: "architect",
          sessionId: "session-1",
          status: "blocked"
        }
      ],
      costSummary: {
        modelCallCount: 7,
        totalUsd: 1.25
      },
      currentCheckpoint: "Architecture boundary",
      currentCostUsd: 1.25,
      gitSummary: {
        activeBranches: ["dev", "feature/ui"],
        workspaceCount: 3
      },
      humanGateStatus: "blocked",
      recentEvidence: [
        {
          checkpointId: "state-tests",
          command: "npm run desktop:test",
          createdAt: "2026-05-29T12:00:00Z",
          evidenceId: "ev-1",
          exitCode: 0
        }
      ],
      sessions: [
        {
          branch: "feature/ui",
          checkpointCount: 3,
          id: "session-1",
          pendingCheckpointCount: 1,
          status: "running",
          title: "Modernize Mission Control"
        }
      ],
      skillSummary: {
        activeSourceCount: 1,
        discoveredSkillCount: 9,
        sourceCount: 2
      }
    };

    render(<MissionControl snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Active agents")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("$1.25")).toBeInTheDocument();
    expect(screen.getByText("openai / gpt-5")).toBeInTheDocument();
    expect(screen.getByText("UI Workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Architecture boundary").length).toBeGreaterThan(1);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByText("Modernize Mission Control")).toBeInTheDocument();
    expect(screen.getByText("feature/ui / running")).toBeInTheDocument();
    expect(screen.getByText("architect")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("npm run desktop:test")).toBeInTheDocument();
  });

  it("renders empty operational states", () => {
    render(
      <MissionControl
        snapshot={{
          activeModel: {
            modelId: "gpt-5",
            providerId: "openai"
          },
          activeProvider: {
            displayName: "OpenAI",
            providerId: "openai"
          },
          activeWorkspace: null,
          activeAgentCount: 0,
          activeSessionCount: 0,
          checkpoints: [],
          costSummary: {
            modelCallCount: 0,
            totalUsd: 0
          },
          currentCheckpoint: "initial",
          currentCostUsd: 0,
          gitSummary: {
            activeBranches: [],
            workspaceCount: 0
          },
          humanGateStatus: "open",
          recentEvidence: [],
          sessions: [],
          skillSummary: {
            activeSourceCount: 0,
            discoveredSkillCount: 0,
            sourceCount: 0
          }
        }}
      />
    );

    expect(screen.getByText("No active sessions")).toBeInTheDocument();
    expect(screen.getByText("No evidence recorded")).toBeInTheDocument();
  });
});
