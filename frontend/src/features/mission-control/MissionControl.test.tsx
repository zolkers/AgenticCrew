import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionControl } from "./MissionControl";
import type { MissionControlSnapshot } from "../../shared/types/core";
import "../../i18n";

describe("MissionControl", () => {
  it("renders the provided mission control snapshot", () => {
    const snapshot: MissionControlSnapshot = {
      activeAgentCount: 4,
      activeSessionCount: 2,
      currentCheckpoint: "Architecture boundary",
      currentCostUsd: 1.25,
      humanGateStatus: "blocked",
      model: "gpt-5",
      provider: "openai"
    };

    render(<MissionControl snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Active agents")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("$1.25")).toBeInTheDocument();
    expect(screen.getByText("openai / gpt-5")).toBeInTheDocument();
    expect(screen.getByText("Architecture boundary")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByText("blocked")).not.toBeInTheDocument();
  });
});
