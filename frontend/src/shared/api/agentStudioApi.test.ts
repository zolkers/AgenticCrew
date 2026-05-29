import { describe, expect, it } from "vitest";
import {
  createAgentTemplate,
  loadAgentStudioSnapshot,
  setAgentTemplateActive,
  updateAgentTemplate
} from "./agentStudioApi";

describe("agentStudioApi", () => {
  it("loads the Rust agent_studio_snapshot command through the injected invoke", async () => {
    const snapshot = {
      activeTemplateCount: 1,
      templates: [],
      trainingRuns: []
    };

    await expect(
      loadAgentStudioSnapshot((command) => {
        expect(command).toBe("agent_studio_snapshot");
        return Promise.resolve(snapshot);
      })
    ).resolves.toEqual(snapshot);
  });

  it("creates an agent template through the injected invoke", async () => {
    const snapshot = {
      activeTemplateCount: 1,
      templates: [],
      trainingRuns: []
    };
    const request = {
      active: true,
      budgetCents: 200,
      description: "Reviews changes",
      harnessProfileId: null,
      id: "review-agent",
      modelId: "gpt-5.2",
      name: "Review Agent",
      providerId: "openai",
      role: "reviewer",
      skillRoutes: []
    };

    await expect(
      createAgentTemplate((command, args) => {
        expect(command).toBe("create_agent_template");
        expect(args).toEqual({ request });
        return Promise.resolve(snapshot);
      }, request)
    ).resolves.toEqual(snapshot);
  });

  it("sets an agent template active state through the injected invoke", async () => {
    const snapshot = {
      activeTemplateCount: 0,
      templates: [],
      trainingRuns: []
    };
    const request = { active: false, templateId: "review-agent" };

    await expect(
      setAgentTemplateActive((command, args) => {
        expect(command).toBe("set_agent_template_active");
        expect(args).toEqual({ request });
        return Promise.resolve(snapshot);
      }, request)
    ).resolves.toEqual(snapshot);
  });

  it("updates an agent template through the injected invoke", async () => {
    const snapshot = {
      activeTemplateCount: 1,
      templates: [],
      trainingRuns: []
    };
    const request = {
      budgetCents: 400,
      description: "Updated guidance",
      harnessProfileId: "pi-execution-discipline",
      modelId: "gpt-5.1",
      name: "Updated Agent",
      providerId: "openai",
      role: "reviewer",
      skillRoutes: ["agenticcrew://skills/review"],
      templateId: "review-agent"
    };

    await expect(
      updateAgentTemplate((command, args) => {
        expect(command).toBe("update_agent_template");
        expect(args).toEqual({ request });
        return Promise.resolve(snapshot);
      }, request)
    ).resolves.toEqual(snapshot);
  });
});
