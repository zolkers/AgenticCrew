import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentStudio } from "./AgentStudio";

describe("AgentStudio", () => {
  it("renders the empty state", () => {
    render(<AgentStudio snapshot={{ activeTemplateCount: 0, templates: [], trainingRuns: [] }} />);

    expect(screen.getByRole("heading", { name: "Agent Studio" })).toBeInTheDocument();
    expect(screen.getByText("No custom agent saved")).toBeInTheDocument();
  });

  it("renders templates without harnesses and queued training runs", () => {
    render(
      <AgentStudio
        snapshot={{
          activeTemplateCount: 1,
          templates: [
            {
              active: true,
              budgetCents: 150,
              description: "Agent without a harness binding",
              harnessProfileId: null,
              id: "loose-agent",
              modelId: "gpt-5",
              name: "Loose Agent",
              providerId: "openai",
              role: "researcher",
              skillRoutes: [],
              version: 2
            }
          ],
          trainingRuns: [
            {
              agentTemplateId: "loose-agent",
              criticScore: null,
              datasetId: "smoke",
              id: "train-1",
              promotedVersion: null,
              status: "draft"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Loose Agent")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("1 training run queued")).toBeInTheDocument();
  });
});
