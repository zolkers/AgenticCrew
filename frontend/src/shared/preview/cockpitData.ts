export type CockpitAgent = Readonly<{
  id: string;
  name: string;
  role: string;
  model: string;
  status: "active" | "queued" | "reviewing";
  tools: readonly string[];
}>;

export type CockpitCheckpoint = Readonly<{
  label: string;
  state: "done" | "running" | "queued";
}>;

export type CockpitWorkspace = Readonly<{
  id: string;
  name: string;
  mission: string;
  branch: string;
  status: string;
  budgetUsedUsd: number;
  budgetLimitUsd: number;
  activeAgentId: string;
  agents: readonly CockpitAgent[];
  checkpoints: readonly CockpitCheckpoint[];
  skills: readonly string[];
  logs: readonly string[];
}>;

export const cockpitWorkspaces: readonly CockpitWorkspace[] = [
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
