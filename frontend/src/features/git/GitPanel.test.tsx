import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GitPanel } from "./GitPanel";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";

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
      skills: [],
      status: "running"
    };

    render(<GitPanel workspace={workspace} />);

    expect(screen.getByRole("heading", { name: "Git Panel" })).toBeInTheDocument();
    expect(screen.getAllByText("codex/settings").length).toBeGreaterThan(0);
    expect(screen.getByText("PR workflow ready")).toBeInTheDocument();
  });
});
