import { beforeEach, describe, expect, it } from "vitest";
import {
  previewAgentStudioInvoke,
  previewHarnessStudioInvoke,
  previewMissionControlInvoke,
  previewRunsInvoke,
  resetPreviewInvokesForTests,
  previewSettingsInvoke,
  previewSkillSourcesInvoke,
  previewWorkspaceInvoke
} from "./previewInvokes";

describe("previewInvokes", () => {
  beforeEach(() => {
    resetPreviewInvokesForTests();
  });

  it("returns a Mission Control preview snapshot for browser previews", async () => {
    await expect(previewMissionControlInvoke("mission_control_snapshot")).resolves.toMatchObject({
      activeModel: {
        modelId: "local-preview",
        providerId: "browser"
      },
      activeProvider: {
        providerId: "browser"
      },
      currentCheckpoint: "Preview mode",
      humanGateStatus: "open"
    });
  });

  it("records model call estimates in Mission Control preview data", async () => {
    await expect(
      previewMissionControlInvoke("record_model_call_estimate", {
        request: {
          cachedTokens: 25,
          estimatedCostUsd: 0.42,
          inputTokens: 100,
          model: "gpt-preview-live",
          outputTokens: 50,
          provider: "openai"
        }
      })
    ).resolves.toMatchObject({
      activeModel: {
        modelId: "gpt-preview-live",
        providerId: "openai"
      },
      activeProvider: {
        displayName: "openai",
        providerId: "openai"
      },
      costSummary: {
        modelCallCount: 1,
        tokenLimit: 1_000_000,
        totalTokens: 150,
        totalUsd: 0.42
      },
      currentCostUsd: 0.42
    });
  });

  it("returns and mutates workspace preview data for browser previews", async () => {
    await expect(previewWorkspaceInvoke("workspace_snapshot")).resolves.toMatchObject({
      workspaces: [{ id: "fullstack-app" }, { id: "mobile-qa" }]
    });

    await expect(
      previewWorkspaceInvoke("create_workspace", {
        request: {
          branch: "feature/api",
          id: "api-platform",
          mission: "Build API",
          name: "API Platform",
          path: "D:\\api"
        }
      })
    ).resolves.toMatchObject({
      workspaces: [
        { id: "fullstack-app" },
        { id: "mobile-qa" },
        { branch: "feature/api", id: "api-platform", path: "D:\\api" }
      ]
    });

    const updated = await previewWorkspaceInvoke("update_workspace_git_context", {
      request: { branch: "feature/manual", path: "D:\\manual", workspaceId: "fullstack-app" }
    });

    expect(updated.workspaces[0]).toMatchObject({
      branch: "feature/manual",
      id: "fullstack-app",
      path: "D:\\manual"
    });

    const loadoutUpdated = await previewWorkspaceInvoke("update_workspace_loadout", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        workspaceId: "fullstack-app"
      }
    });

    expect(loadoutUpdated.workspaces[0]).toMatchObject({
      id: "fullstack-app",
      selectedAgentTemplateId: "developer-pi",
      selectedHarnessProfileId: "pi-execution-discipline"
    });
  });

  it("uses preview workspace fallbacks when action args are absent", async () => {
    await expect(previewWorkspaceInvoke("create_workspace")).resolves.toMatchObject({
      workspaces: [
        { id: "fullstack-app" },
        { id: "mobile-qa" },
        {
          branch: "main",
          id: "preview-workspace",
          mission: "Start a new agent mission",
          name: "Preview Workspace",
          path: "local"
        }
      ]
    });

    const updated = await previewWorkspaceInvoke("update_workspace_git_context", {
      request: { workspaceId: "fullstack-app" }
    });

    expect(updated.workspaces[0]).toMatchObject({
      branch: "codex/cockpit-prototype",
      id: "fullstack-app",
      path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew"
    });

    const loadoutUpdated = await previewWorkspaceInvoke("update_workspace_loadout", {
      request: { workspaceId: "fullstack-app" }
    });

    expect(loadoutUpdated.workspaces[0]).toMatchObject({
      id: "fullstack-app",
      selectedAgentTemplateId: null,
      selectedHarnessProfileId: null
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

  it("queues preview runs with selected mission skills", async () => {
    const snapshot = await previewRunsInvoke("start_run", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        id: "run-preview",
        modelId: "gpt-5",
        providerId: "openai",
        skillRoutes: ["agenticcrew://skills/superpowers/subagent-driven-development"],
        task: " Validate browser preview run ",
        workspaceId: "fullstack-app"
      }
    });

    expect(snapshot).toMatchObject({
      activeRunId: "run-preview",
      events: [
        expect.objectContaining({
          message: "Run queued for workspace 'fullstack-app'",
          runId: "run-preview"
        })
      ],
      runs: [
        expect.objectContaining({
          baseBranch: "codex/cockpit-prototype",
          id: "run-preview",
          skillRoutes: ["agenticcrew://skills/superpowers/subagent-driven-development"],
          task: "Validate browser preview run",
          workspaceId: "fullstack-app"
        })
      ]
    });
  });

  it("uses preview run defaults when action args are absent", async () => {
    await expect(previewRunsInvoke("start_run")).resolves.toMatchObject({
      activeRunId: "preview-run-1",
      runs: [
        expect.objectContaining({
          baseBranch: "main",
          id: "preview-run-1",
          skillRoutes: [],
          task: "Preview run",
          workspaceId: "fullstack-app"
        })
      ]
    });
  });

  it("mutates preview skill source workflow state", async () => {
    await previewSkillSourcesInvoke("register_github_skill_source", {
      request: {
        id: "preview-market",
        repositoryUrl: "https://github.com/preview/market",
        selectedRef: "main"
      }
    });
    await previewSkillSourcesInvoke("sync_github_skill_source", { sourceId: "preview-market" });
    await previewSkillSourcesInvoke("approve_skill_source_permissions", {
      policy: {
        commands: [{ command: "git" }],
        docker: false,
        fileSystem: [],
        git: true,
        network: [{ host: "github.com" }]
      },
      sourceId: "preview-market"
    });
    await previewSkillSourcesInvoke("activate_skill_source", { sourceId: "preview-market" });

    await expect(previewSkillSourcesInvoke("skill_sources_snapshot")).resolves.toMatchObject({
      activeSourceCount: 1,
      sources: [
        { id: "preview-superpowers" },
        {
          active: true,
          discoveredSkills: [{ name: "planning" }],
          id: "preview-market",
          permissionGate: { approved: true },
          status: "validated"
        }
      ]
    });
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

    const toggled = await previewHarnessStudioInvoke("set_harness_profile_active", {
      request: {
        active: false,
        profileId: "pi-execution-discipline"
      }
    });

    expect(toggled).toMatchObject({
      activeProfileCount: 1
    });
    expect(toggled.profiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ active: false, id: "pi-execution-discipline" })])
    );
  });

  it("persists preview PI extension import before activation", async () => {
    await expect(
      previewHarnessStudioInvoke("import_pi_extension", {
        request: {
          basePolicy: "Add preview PI protocol.",
          description: "Preview import",
          id: "preview-import",
          name: "Preview Import"
        }
      })
    ).resolves.toMatchObject({
      activePiExtensionCount: 0,
      piExtensions: [{ active: false, id: "preview-import", inspected: true }]
    });

    await expect(
      previewHarnessStudioInvoke("set_harness_profile_active", {
        request: {
          active: true,
          profileId: "pi-execution-discipline"
        }
      })
    ).resolves.toMatchObject({
      profiles: [{ active: true, id: "pi-execution-discipline" }]
    });

    await expect(
      previewHarnessStudioInvoke("set_pi_extension_active", {
        request: {
          active: true,
          extensionId: "preview-import"
        }
      })
    ).resolves.toMatchObject({
      activePiExtensionCount: 1,
      effectiveHarnesses: [expect.objectContaining({ piExtensionCount: 1 })],
      piExtensions: [{ active: true, id: "preview-import" }]
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

    const fallbackToggled = await previewHarnessStudioInvoke("set_harness_profile_active");
    expect(fallbackToggled).toMatchObject({
      activeProfileCount: 1
    });
    expect(fallbackToggled.profiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ active: true, id: "pi-execution-discipline" })])
    );

    const fallbackProfileToggle = await previewHarnessStudioInvoke("set_harness_profile_active", {
      request: {
        profileId: "pi-execution-discipline"
      }
    });
    expect(fallbackProfileToggle).toMatchObject({ activeProfileCount: 1 });
    expect(fallbackProfileToggle.profiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ active: true, id: "pi-execution-discipline" })])
    );
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
    const snapshot = await previewAgentStudioInvoke("agent_studio_snapshot");

    expect(snapshot).toMatchObject({
      activeTemplateCount: 1,
      templates: [{ id: "developer-pi", harnessProfileId: "pi-execution-discipline" }]
    });
    expect(snapshot.trainingRuns).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "preview-train-release", status: "completed" })])
    );
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

  it("promotes preview agent training runs", async () => {
    const snapshot = await previewAgentStudioInvoke("promote_agent_training_run", {
      request: { trainingRunId: "preview-train-release" }
    });

    expect(snapshot.templates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "developer-pi", version: 2 })])
    );
    expect(snapshot.trainingRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "preview-train-release", promotedVersion: 2, status: "promoted" })
      ])
    );
  });

  it("keeps preview agent data when a training promotion target is missing", async () => {
    const snapshot = await previewAgentStudioInvoke("promote_agent_training_run", {
      request: { trainingRunId: "missing-run" }
    });

    expect(snapshot.templates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "developer-pi", version: 1 })])
    );
    expect(snapshot.trainingRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "preview-train-release", promotedVersion: null, status: "completed" })
      ])
    );
  });

  it("keeps preview agent data when a training promotion is not eligible", async () => {
    const promotedSnapshot = await previewAgentStudioInvoke("promote_agent_training_run", {
      request: { trainingRunId: "preview-train-smoke" }
    });
    const orphanSnapshot = await previewAgentStudioInvoke("promote_agent_training_run", {
      request: { trainingRunId: "preview-train-orphan" }
    });

    expect(promotedSnapshot.templates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "developer-pi", version: 1 })])
    );
    expect(orphanSnapshot.templates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "developer-pi", version: 1 })])
    );
  });

  it("returns and updates preview settings metadata", async () => {
    await expect(previewSettingsInvoke("settings_snapshot")).resolves.toMatchObject({
      aiProvider: {
        apiKeyConfigured: false,
        modelSyncStatus: "never_synced",
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

  it("returns a recoverable preview model sync failure without an api key", async () => {
    await expect(
      previewSettingsInvoke("sync_provider_models", {
        request: {
          providerId: "openai"
        }
      })
    ).resolves.toMatchObject({
      aiProvider: {
        modelSyncError: "OpenAI API key is required before syncing models",
        modelSyncStatus: "failed"
      }
    });
  });

  it("returns synced preview models with a transient api key", async () => {
    const snapshot = await previewSettingsInvoke("sync_provider_models", {
      request: {
        apiKey: "sk-proj-9999",
        providerId: "openai"
      }
    });

    expect(snapshot.aiProvider).toMatchObject({
      apiKeyConfigured: true,
      apiKeyLastFour: "9999",
      modelSyncError: null,
      modelSyncStatus: "synced",
      selectedModelId: "gpt-preview-live"
    });
    expect(snapshot.aiProvider.availableModels).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "gpt-preview-live" })])
    );
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
