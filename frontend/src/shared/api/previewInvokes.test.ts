import { describe, expect, it } from "vitest";
import {
  previewAgentStudioInvoke,
  previewHarnessStudioInvoke,
  previewMissionControlInvoke,
  previewSettingsInvoke,
  previewSkillSourcesInvoke
} from "./previewInvokes";

describe("previewInvokes", () => {
  it("returns a Mission Control preview snapshot for browser previews", async () => {
    await expect(previewMissionControlInvoke("mission_control_snapshot")).resolves.toMatchObject({
      currentCheckpoint: "Preview mode",
      humanGateStatus: "open",
      model: "local-preview",
      provider: "browser"
    });
  });

  it("returns skill source preview data for browser previews", async () => {
    await expect(previewSkillSourcesInvoke("skill_sources_snapshot")).resolves.toMatchObject({
      activeSourceCount: 0,
      sources: [
        {
          id: "preview-superpowers",
          lastSyncStatus: "never_synced",
          status: "pending_validation"
        }
      ]
    });
  });

  it("accepts preview skill source actions without mutating data", async () => {
    await expect(previewSkillSourcesInvoke("sync_github_skill_source", { sourceId: "preview-superpowers" })).resolves
      .toBeUndefined();
  });

  it("returns Harness Studio preview data for browser previews", async () => {
    await expect(previewHarnessStudioInvoke("harness_studio_snapshot")).resolves.toMatchObject({
      activeProfileCount: 1,
      profiles: [{ id: "pi-execution-discipline" }]
    });
  });

  it("handles preview harness profile creation and activation toggles", async () => {
    await expect(
      previewHarnessStudioInvoke("create_harness_profile", {
        request: {
          active: true,
          basePolicy: "Validate",
          description: "Local preview",
          id: "local-preview",
          name: "Local Preview"
        }
      })
    ).resolves.toMatchObject({
      activeProfileCount: 2,
      profiles: [{ id: "pi-execution-discipline" }, { id: "local-preview" }]
    });

    await expect(
      previewHarnessStudioInvoke("set_harness_profile_active", {
        request: {
          active: false,
          profileId: "pi-execution-discipline"
        }
      })
    ).resolves.toMatchObject({
      activeProfileCount: 0,
      profiles: [{ active: false, id: "pi-execution-discipline" }]
    });
  });

  it("uses preview harness fallbacks when action args are absent", async () => {
    await expect(previewHarnessStudioInvoke("create_harness_profile")).resolves.toMatchObject({
      activeProfileCount: 1,
      profiles: [
        { id: "pi-execution-discipline" },
        {
          active: false,
          description: "Preview local harness",
          id: "preview-local",
          modules: [{ content: "Preview base policy" }],
          name: "Preview Local"
        }
      ]
    });

    await expect(previewHarnessStudioInvoke("set_harness_profile_active")).resolves.toMatchObject({
      activeProfileCount: 1,
      profiles: [{ active: true, id: "pi-execution-discipline" }]
    });

    await expect(
      previewHarnessStudioInvoke("set_harness_profile_active", {
        request: {
          profileId: "pi-execution-discipline"
        }
      })
    ).resolves.toMatchObject({
      activeProfileCount: 1,
      profiles: [{ active: true, id: "pi-execution-discipline" }]
    });
  });

  it("handles preview harness profile updates", async () => {
    await expect(
      previewHarnessStudioInvoke("update_harness_profile", {
        request: {
          basePolicy: "Require evidence",
          description: "Updated profile",
          name: "Updated PI",
          profileId: "pi-execution-discipline"
        }
      })
    ).resolves.toMatchObject({
      profiles: [
        {
          description: "Updated profile",
          id: "pi-execution-discipline",
          modules: [{ content: "Require evidence", version: "2" }],
          name: "Updated PI",
          version: "2"
        }
      ]
    });
  });

  it("keeps preview harness data when update args are absent", async () => {
    await expect(previewHarnessStudioInvoke("update_harness_profile")).resolves.toMatchObject({
      profiles: [{ id: "pi-execution-discipline", name: "Pi Execution Discipline" }]
    });
  });

  it("keeps preview harness data when an update target is missing", async () => {
    await expect(
      previewHarnessStudioInvoke("update_harness_profile", {
        request: {
          basePolicy: "Require evidence",
          description: "Updated profile",
          name: "Updated PI",
          profileId: "missing"
        }
      })
    ).resolves.toMatchObject({
      profiles: [{ id: "pi-execution-discipline", name: "Pi Execution Discipline" }]
    });
  });

  it("returns Agent Studio preview data for browser previews", async () => {
    await expect(previewAgentStudioInvoke("agent_studio_snapshot")).resolves.toMatchObject({
      activeTemplateCount: 1,
      templates: [{ id: "developer-pi", harnessProfileId: "pi-execution-discipline" }]
    });
  });

  it("handles preview agent creation and activation toggles", async () => {
    await expect(
      previewAgentStudioInvoke("create_agent_template", {
        request: {
          active: true,
          budgetCents: 500,
          description: "Reviews changes",
          harnessProfileId: "pi-execution-discipline",
          id: "review-agent",
          modelId: "gpt-5.2",
          name: "Review Agent",
          providerId: "openai",
          role: "reviewer",
          skillRoutes: ["agenticcrew://skills/review"]
        }
      })
    ).resolves.toMatchObject({
      activeTemplateCount: 2,
      templates: [
        { id: "developer-pi" },
        {
          active: true,
          budgetCents: 500,
          harnessProfileId: "pi-execution-discipline",
          id: "review-agent",
          skillRoutes: ["agenticcrew://skills/review"]
        }
      ]
    });

    await expect(
      previewAgentStudioInvoke("set_agent_template_active", {
        request: {
          active: false,
          templateId: "developer-pi"
        }
      })
    ).resolves.toMatchObject({
      activeTemplateCount: 0,
      templates: [{ active: false, id: "developer-pi" }]
    });
  });

  it("uses preview agent fallbacks when action args are absent", async () => {
    await expect(previewAgentStudioInvoke("create_agent_template")).resolves.toMatchObject({
      activeTemplateCount: 1,
      templates: [
        { id: "developer-pi" },
        {
          active: false,
          budgetCents: 200,
          description: "Preview local agent",
          harnessProfileId: null,
          id: "preview-agent",
          name: "Preview Agent",
          skillRoutes: []
        }
      ]
    });

    await expect(previewAgentStudioInvoke("set_agent_template_active")).resolves.toMatchObject({
      activeTemplateCount: 1,
      templates: [{ active: true, id: "developer-pi" }]
    });

    await expect(
      previewAgentStudioInvoke("set_agent_template_active", {
        request: {
          templateId: "developer-pi"
        }
      })
    ).resolves.toMatchObject({
      activeTemplateCount: 1,
      templates: [{ active: true, id: "developer-pi" }]
    });
  });

  it("handles preview agent template updates", async () => {
    await expect(
      previewAgentStudioInvoke("update_agent_template", {
        request: {
          budgetCents: 450,
          description: "Updated guidance",
          harnessProfileId: null,
          modelId: "gpt-5.1",
          name: "Updated Developer",
          providerId: "openai",
          role: "lead",
          skillRoutes: ["agenticcrew://skills/review"],
          templateId: "developer-pi"
        }
      })
    ).resolves.toMatchObject({
      templates: [
        {
          budgetCents: 450,
          description: "Updated guidance",
          harnessProfileId: null,
          id: "developer-pi",
          modelId: "gpt-5.1",
          name: "Updated Developer",
          role: "lead",
          skillRoutes: ["agenticcrew://skills/review"],
          version: 2
        }
      ]
    });
  });

  it("keeps preview agent data when update args are absent", async () => {
    await expect(previewAgentStudioInvoke("update_agent_template")).resolves.toMatchObject({
      templates: [{ id: "developer-pi", name: "Developer Agent" }]
    });
  });

  it("keeps preview agent data when an update target is missing", async () => {
    await expect(
      previewAgentStudioInvoke("update_agent_template", {
        request: {
          budgetCents: 450,
          description: "Updated guidance",
          harnessProfileId: null,
          modelId: "gpt-5.1",
          name: "Updated Developer",
          providerId: "openai",
          role: "lead",
          skillRoutes: ["agenticcrew://skills/review"],
          templateId: "missing"
        }
      })
    ).resolves.toMatchObject({
      templates: [{ id: "developer-pi", name: "Developer Agent" }]
    });
  });

  it("returns and updates preview settings metadata", async () => {
    await expect(previewSettingsInvoke("settings_snapshot")).resolves.toMatchObject({
      aiProvider: {
        apiKeyConfigured: false,
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    });

    await expect(
      previewSettingsInvoke("update_ai_provider_settings", {
        request: {
          apiKey: "sk-proj-9999",
          providerId: "openai",
          selectedModelId: "gpt-5.1"
        }
      })
    ).resolves.toMatchObject({
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "9999",
        selectedModelId: "gpt-5.1"
      }
    });
  });

  it("keeps preview settings defaults when update args are absent", async () => {
    await expect(previewSettingsInvoke("update_ai_provider_settings")).resolves.toMatchObject({
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        selectedModelId: "gpt-5"
      }
    });
  });

  it("clears preview settings api key metadata when an empty key is provided", async () => {
    await expect(
      previewSettingsInvoke("update_ai_provider_settings", {
        request: {
          apiKey: "",
          providerId: "openai",
          selectedModelId: "gpt-5.2"
        }
      })
    ).resolves.toMatchObject({
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        selectedModelId: "gpt-5.2"
      }
    });
  });
});
