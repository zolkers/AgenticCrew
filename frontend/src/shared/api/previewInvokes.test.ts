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

  it("returns Agent Studio preview data for browser previews", async () => {
    await expect(previewAgentStudioInvoke("agent_studio_snapshot")).resolves.toMatchObject({
      activeTemplateCount: 1,
      templates: [{ id: "developer-pi", harnessProfileId: "pi-execution-discipline" }]
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
});
