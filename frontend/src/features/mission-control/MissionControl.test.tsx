import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionControl } from "./MissionControl";

describe("MissionControl", () => {
  it("shows the static session snapshot invariants", () => {
    render(<MissionControl />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Active agents")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("openai / gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("Design approved")).toBeInTheDocument();
    expect(screen.getByText("Human gate pending")).toBeInTheDocument();
  });
});
