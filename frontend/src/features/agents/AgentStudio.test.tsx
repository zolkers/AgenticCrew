import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentStudio } from "./AgentStudio";
import type {
  AgentStudioSnapshot,
  AiModelRecord,
  DiscoveredSkillManifest,
  HarnessStudioSnapshot
} from "../../shared/types/core";

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

const modelOptions: AiModelRecord[] = [
  { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
  { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
  { id: "gpt-5", label: "GPT-5", providerId: "openai" }
];

const availableSkillRoutes: DiscoveredSkillManifest[] = [
  {
    description: "Plan work safely",
    id: "superpowers/planning",
    name: "planning",
    relativePath: "skills/planning/SKILL.md",
    route: "agenticcrew://skills/superpowers/planning"
  }
];

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
      status: "completed"
    },
    {
      agentTemplateId: "loose-agent",
      criticScore: 0.91,
      datasetId: "release-regression",
      id: "train-2",
      promotedVersion: 3,
      status: "promoted"
    }
  ],
  evaluationRuns: [
    {
      agentTemplateId: "loose-agent",
      artifactPath: "evaluations/loose-agent/release.json",
      baselineVersion: 1,
      candidateVersion: 2,
      estimatedCostCents: 37,
      id: "eval-1",
      regressionCount: 0,
      score: 96,
      status: "passed",
      suiteId: "release-regression"
    }
  ],
  versionSummaries: [
    {
      active: true,
      currentVersion: 2,
      latestTrainingStatus: "promoted",
      promotedTrainingCount: 1,
      templateId: "loose-agent",
      templateName: "Loose Agent"
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

  it("renders templates without exposing placeholder training surfaces", () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn()}
        snapshot={templateSnapshot}
      />
    );

    expect(screen.getAllByText("Loose Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("None").length).toBeGreaterThan(0);
    expect(screen.getByText("Agent without a harness binding")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Version ledger" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Training lane" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Evaluation lane" })).toBeNull();
    expect(screen.queryByText("preview-smoke")).toBeNull();
  });

  it("keeps legacy template models selectable when the provider registry omits them", () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn()}
        modelOptions={modelOptions.filter((model) => model.id !== "gpt-5")}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("option", { name: "gpt-5" })).toHaveValue("gpt-5");
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
        modelOptions={modelOptions}
        onSnapshotChange={onSnapshotChange}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New agent" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Review_1 Agent" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "qa" } });
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "gpt-5.1" } });
    fireEvent.change(screen.getByLabelText("Harness"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Budget"), { target: { value: "2.50" } });
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Reviews pull requests." } });
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

    render(
      <AgentStudio
        harnessSnapshot={noHarnessSnapshot}
        invoke={invoke}
        modelOptions={modelOptions}
        snapshot={emptySnapshot}
      />
    );

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

  it("keeps creation disabled until a provider model is available", () => {
    render(<AgentStudio harnessSnapshot={noHarnessSnapshot} invoke={vi.fn()} snapshot={emptySnapshot} />);

    expect(screen.getByRole("button", { name: "Create agent" })).toBeDisabled();
  });

  it("adds discovered marketplace skill routes to the agent form", async () => {
    const invoke = vi.fn().mockResolvedValue(emptySnapshot);

    render(
      <AgentStudio
        availableSkillRoutes={availableSkillRoutes}
        harnessSnapshot={noHarnessSnapshot}
        invoke={invoke}
        modelOptions={modelOptions}
        snapshot={emptySnapshot}
      />
    );

    fireEvent.change(screen.getByLabelText("Skill routes"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    expect(screen.getByLabelText("Skill routes")).toHaveValue("agenticcrew://skills/superpowers/planning");
    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    expect(screen.getByLabelText("Skill routes")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("create_agent_template", {
        request: {
          active: true,
          budgetCents: 200,
          description: "Custom workspace agent.",
          harnessProfileId: null,
          id: "review-agent",
          modelId: "gpt-5.2",
          name: "Review Agent",
          providerId: "openai",
          role: "reviewer",
          skillRoutes: ["agenticcrew://skills/superpowers/planning"]
        }
      });
    });
  });

  it("surfaces creation failures", async () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn().mockRejectedValue(new Error("duplicate"))}
        modelOptions={modelOptions}
        snapshot={emptySnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New agent" }));
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByText("Agent creation failed")).toBeInTheDocument();
  });

  it("edits an existing agent template", async () => {
    const nextSnapshot: AgentStudioSnapshot = {
      activeTemplateCount: 1,
      templates: [
        {
          ...templateSnapshot.templates[0],
          budgetCents: 325,
          description: "Updated guidance",
          harnessProfileId: "pi-execution-discipline",
          modelId: "gpt-5.1",
          name: "Updated Agent",
          role: "lead",
          skillRoutes: ["agenticcrew://skills/review"],
          version: 3
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
        modelOptions={modelOptions}
        onSnapshotChange={onSnapshotChange}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Route")).toHaveValue("agenticcrew://agents/local/loose-agent");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated Agent" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "lead" } });
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "gpt-5.1" } });
    fireEvent.change(screen.getByLabelText("Harness"), { target: { value: "pi-execution-discipline" } });
    fireEvent.change(screen.getByLabelText("Budget"), { target: { value: "3.25" } });
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Updated guidance" } });
    fireEvent.change(screen.getByLabelText("Skill routes"), {
      target: { value: "agenticcrew://skills/review" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("update_agent_template", {
      request: {
        budgetCents: 325,
        description: "Updated guidance",
        harnessProfileId: "pi-execution-discipline",
        modelId: "gpt-5.1",
        name: "Updated Agent",
        providerId: "openai",
        role: "lead",
        skillRoutes: ["agenticcrew://skills/review"],
        templateId: "loose-agent"
      }
    });
  });

  it("surfaces update failures", async () => {
    render(
      <AgentStudio
        harnessSnapshot={harnessSnapshot}
        invoke={vi.fn().mockRejectedValue(new Error("failed"))}
        snapshot={templateSnapshot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));

    expect(await screen.findByText("Agent update failed")).toBeInTheDocument();
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
