import type { WorkspaceRecord } from "../types/core";

export type CockpitWorkspace = WorkspaceRecord;

export const cockpitWorkspaces: readonly WorkspaceRecord[] = [
  {
    activeAgentId: "ui-architect",
    agents: [
      {
        id: "ui-architect",
        model: "gpt-5",
        name: "frontend-lead",
        role: "UI architect",
        status: "active",
        tools: ["react", "vitest", "css-audit"]
      },
      {
        id: "review",
        model: "gpt-5-mini",
        name: "accessibility-review",
        role: "Semantic QA",
        status: "reviewing",
        tools: ["testing-library", "axe-notes"]
      },
      {
        id: "docs",
        model: "gpt-5-mini",
        name: "release-scribe",
        role: "Handoff notes",
        status: "queued",
        tools: ["markdown"]
      }
    ],
    branch: "codex/cockpit-prototype",
    budgetLimitUsd: 12,
    budgetUsedUsd: 4.75,
    checkpoints: [
      { label: "Read current frontend shell", state: "done" },
      { label: "Build UI shell", state: "running" },
      { label: "Verify cockpit navigation", state: "queued" }
    ],
    id: "fullstack-app",
    gitHistory: [
      {
        author: "Codex",
        branch: "codex/cockpit-prototype",
        hash: "30cf496",
        message: "feat(cockpit): expose branch picker and token usage",
        relativeTime: "2 minutes ago"
      },
      {
        author: "Codex",
        branch: "codex/cockpit-prototype",
        hash: "3b3104d",
        message: "feat(cockpit): add agent overview instructions",
        relativeTime: "Earlier today"
      },
      {
        author: "Codex",
        branch: "codex/cockpit-prototype",
        hash: "3f1287f",
        message: "style(ui): expand cockpit terminal focus",
        relativeTime: "Earlier today"
      }
    ],
    path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
    logs: [
      "$ agenticcrew attach fullstack-app --workspace frontend",
      "workspace resolved: fullstack-app / branch codex/cockpit-prototype",
      "frontend-lead: mapping Mission Control and Skill Sources into cockpit navigation",
      "css-audit: terminal contrast target AA, labels remain visible at mobile widths",
      "checkpoint: Build UI shell is running"
    ],
    mission: "Build UI shell",
    name: "Fullstack App",
    skills: ["superpowers:tdd", "browser:visual-qa", "github:pr-context"],
    status: "running"
  },
  {
    activeAgentId: "playwright-runner",
    agents: [
      {
        id: "playwright-runner",
        model: "gpt-5-mini",
        name: "playwright-runner",
        role: "Device smoke tester",
        status: "active",
        tools: ["browser", "screenshots", "console"]
      },
      {
        id: "trace-reader",
        model: "gpt-5",
        name: "trace-reader",
        role: "Failure triage",
        status: "queued",
        tools: ["trace-viewer", "vitest"]
      }
    ],
    branch: "codex/mobile-smoke",
    budgetLimitUsd: 8,
    budgetUsedUsd: 2.2,
    checkpoints: [
      { label: "Boot preview server", state: "done" },
      { label: "Stabilize device smoke", state: "running" },
      { label: "Capture regression notes", state: "queued" }
    ],
    id: "mobile-qa",
    gitHistory: [
      {
        author: "Codex",
        branch: "codex/mobile-smoke",
        hash: "7747189",
        message: "feat(ui): constrain desktop workspace shell",
        relativeTime: "Earlier today"
      },
      {
        author: "Codex",
        branch: "codex/mobile-smoke",
        hash: "5e7afa2",
        message: "fix(scripts): clarify docker daemon requirement",
        relativeTime: "Yesterday"
      }
    ],
    path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
    logs: [
      "$ agenticcrew run mobile-qa --viewport compact",
      "playwright-runner: checking topbar, terminal stream, and sidebar density",
      "device smoke: 390px layout has no clipped labels",
      "checkpoint: Stabilize device smoke is running"
    ],
    mission: "Stabilize device smoke",
    name: "Mobile QA",
    skills: ["browser:browser", "superpowers:verification", "testing-library"],
    status: "observing"
  }
];
