import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type { MissionControlSnapshot } from "../shared/types/core";

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Mission Control as the default screen", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
  });

  it("renders injected mission control data instead of fallback data", async () => {
    const snapshot: MissionControlSnapshot = {
      activeAgentCount: 9,
      activeSessionCount: 5,
      currentCheckpoint: "Injected from invoke",
      currentCostUsd: 4.75,
      humanGateStatus: "open",
      model: "gpt-5",
      provider: "openai"
    };

    render(<App missionControlInvoke={() => Promise.resolve(snapshot)} />);

    expect(await screen.findByText("Injected from invoke")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Design approved")).not.toBeInTheDocument());
  });

  it("uses the browser fallback only when no invoke dependency is supplied", async () => {
    render(<App />);

    expect(await screen.findByText("Design approved")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
