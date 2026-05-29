import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentStudio } from "./AgentStudio";
import type { AgentStudioSnapshot, HarnessStudioSnapshot } from "../../shared/types/core";

const harnessSnapshot: HarnessStudioSnapshot = {
  activeProfileCount: 1,
  bindings: [],
  profiles: [
    {
      active: true,
      description: "Built-in execution policy",
      id: "pi-execution-discipline",
      modules: [],
      name: "Pi Execution Discipline",
      skillRoutes: [],
      version: "1"
    }
  ]
};

const emptySnapshot: AgentStudioSnapshot = {
  activeTemplateCount: 0,
  templates: [],
  trainingRuns: []
};

const noHarnessSnapshot: HarnessStudioSnapshot = {
  activeProfileCount: 0,
  bindings: [],
  profiles: []
};

const templateSnapshot: AgentStudioSnapshot = {
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
};

describe("AgentStudio", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the empty state", () => {
    render(<AgentStudio harnessSnapshot={harnessSnapshot} invoke={vi.fn()} snapshot={emptySnapshot} />);

    expect(screen.getByRole("heading", { name: "Agent Studio" })).toBeInTheDocument();
    expect(screen.getByText("No custom agent saved")).toBeInTheDocument();
  });

  it("renders templates without harnesses and queued training runs", () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn()}
        snapshot={templateSnapshot}
      />
    );

    expect(screen.getByText("Loose Agent")).toBeInTheDocument();
    expect(screen.getAllByText("None").length).toBeGreaterThan(0);
    expect(screen.getByText("1 training run queued")).toBeInTheDocument();
  });

  it("renders inactive templates with an activate action", () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn()}
        snapshot={{
          activeTemplateCount: 0,
          templates: templateSnapshot.templates.map((template) => ({ ...template, active: false })),
          trainingRuns: []
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });

  it("creates a local agent template from the form", async () => {
    const nextSnapshot: AgentStudioSnapshot = {
      activeTemplateCount: 2,
      templates: [
        ...templateSnapshot.templates,
        {
          active: true,
          budgetCents: 250,
          description: "Reviews pull requests.",
          harnessProfileId: null,
          id: "review_1-agent",
          modelId: "gpt-5.2",
          name: "Review_1 Agent",
          providerId: "openai",
          role: "reviewer",
          skillRoutes: ["agenticcrew://skills/a", "agenticcrew://skills/b"],
          version: 1
        }
      ],
      trainingRuns: []
    };
    const invoke = vi.fn().mockResolvedValue(nextSnapshot);
    const onSnapshotChange = vi.fn();

    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Review_1 Agent" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "qa" } });
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "gpt-5.1" } });
    fireEvent.change(screen.getByLabelText("Harness"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Budget"), { target: { value: "2.50" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Reviews pull requests." } });
    fireEvent.change(screen.getByLabelText("Skill routes"), {
      target: { value: "agenticcrew://skills/a\r\nagenticcrew://skills/b\n" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("create_agent_template", {
      request: {
        active: true,
        budgetCents: 250,
        description: "Reviews pull requests.",
        harnessProfileId: null,
        id: "review_1-agent",
        modelId: "gpt-5.1",
        name: "Review_1 Agent",
        providerId: "openai",
        role: "qa",
        skillRoutes: ["agenticcrew://skills/a", "agenticcrew://skills/b"]
      }
    });
  });

  it("creates a local agent with empty optional form values", async () => {
    const invoke = vi.fn().mockResolvedValue(emptySnapshot);

    render(<AgentStudio harnessSnapshot={noHarnessSnapshot} invoke={invoke} snapshot={emptySnapshot} />);

    fireEvent.change(screen.getByLabelText("Budget"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Skill routes"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("create_agent_template", {
        request: {
          active: true,
          budgetCents: 0,
          description: "Custom workspace agent.",
          harnessProfileId: null,
          id: "review-agent",
          modelId: "gpt-5.2",
          name: "Review Agent",
          providerId: "openai",
          role: "reviewer",
          skillRoutes: []
        }
      });
    });
  });

  it("surfaces creation failures", async () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn().mockRejectedValue(new Error("duplicate"))}
        snapshot={emptySnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByText("Agent creation failed")).toBeInTheDocument();
  });

  it("toggles agent template activation and surfaces failures", async () => {
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ...templateSnapshot,
        activeTemplateCount: 0,
        templates: templateSnapshot.templates.map((template) => ({ ...template, active: false }))
      });
    const onSnapshotChange = vi.fn();

    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(await screen.findByText("Agent status update failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalled();
    });
    expect(invoke).toHaveBeenLastCalledWith("set_agent_template_active", {
      request: { active: false, templateId: "loose-agent" }
    });
  });
});
