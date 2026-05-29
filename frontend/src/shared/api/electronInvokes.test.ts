import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  electronAgentStudioInvoke,
  electronHarnessStudioInvoke,
  electronMissionControlInvoke,
  electronRunsInvoke,
  electronSettingsInvoke,
  electronSkillSourcesInvoke,
  electronWorkspaceInvoke
} from "./electronInvokes";

describe("electronInvokes", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "agenticcrew");
  });

  it("forwards snapshot commands through the Electron bridge", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    window.agenticcrew = { invoke };

    await expect(electronMissionControlInvoke("mission_control_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronSkillSourcesInvoke("skill_sources_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronHarnessStudioInvoke("harness_studio_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronAgentStudioInvoke("agent_studio_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronSettingsInvoke("settings_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronWorkspaceInvoke("workspace_snapshot")).resolves.toEqual({ ok: true });
    await expect(electronRunsInvoke("runs_snapshot")).resolves.toEqual({ ok: true });

    expect(invoke).toHaveBeenCalledWith("mission_control_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("skill_sources_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("harness_studio_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("agent_studio_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("settings_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("workspace_snapshot", undefined);
    expect(invoke).toHaveBeenCalledWith("runs_snapshot", undefined);
  });

  it("forwards command args through the Electron bridge", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    window.agenticcrew = { invoke };

    await expect(electronSkillSourcesInvoke("sync_github_skill_source", { sourceId: "superpowers" })).resolves
      .toBeUndefined();
    await expect(
      electronSkillSourcesInvoke("register_github_skill_source", {
        request: {
          id: "superpowers",
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main"
        }
      })
    ).resolves.toBeUndefined();
    await expect(electronSkillSourcesInvoke("activate_skill_source", { sourceId: "superpowers" })).resolves
      .toBeUndefined();
    await expect(electronHarnessStudioInvoke("set_harness_profile_active", {
      request: { active: false, profileId: "local" }
    })).resolves.toBeUndefined();
    await expect(
      electronAgentStudioInvoke("set_agent_template_active", {
        request: { active: false, templateId: "review-agent" }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronHarnessStudioInvoke("update_harness_profile", {
        request: { basePolicy: "Validate", description: "Local", name: "Local", profileId: "local" }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronAgentStudioInvoke("update_agent_template", {
        request: {
          budgetCents: 200,
          description: "Local",
          harnessProfileId: null,
          modelId: "gpt-5.2",
          name: "Local",
          providerId: "openai",
          role: "developer",
          skillRoutes: [],
          templateId: "local"
        }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronAgentStudioInvoke("promote_agent_training_run", {
        request: { trainingRunId: "train-release" }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronWorkspaceInvoke("update_workspace_git_context", {
        request: { branch: "main", path: "D:\\repo", workspaceId: "repo" }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronWorkspaceInvoke("refresh_workspace_git_status", {
        request: { workspaceId: "repo" }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronWorkspaceInvoke("update_workspace_loadout", {
        request: {
          agentTemplateId: "developer-pi",
          harnessProfileId: "pi-execution-discipline",
          workspaceId: "repo"
        }
      })
    ).resolves.toBeUndefined();
    await expect(
      electronRunsInvoke("start_run", {
        request: {
          agentTemplateId: "developer-pi",
          harnessProfileId: "pi-execution-discipline",
          id: "run-1",
          task: "Build",
          workspaceId: "repo"
        }
      })
    ).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith("sync_github_skill_source", { sourceId: "superpowers" });
    expect(invoke).toHaveBeenCalledWith("register_github_skill_source", {
      request: {
        id: "superpowers",
        repositoryUrl: "https://github.com/obra/superpowers",
        selectedRef: "main"
      }
    });
    expect(invoke).toHaveBeenCalledWith("activate_skill_source", { sourceId: "superpowers" });
    expect(invoke).toHaveBeenCalledWith("set_harness_profile_active", {
      request: { active: false, profileId: "local" }
    });
    expect(invoke).toHaveBeenCalledWith("set_agent_template_active", {
      request: { active: false, templateId: "review-agent" }
    });
    expect(invoke).toHaveBeenCalledWith("update_harness_profile", {
      request: { basePolicy: "Validate", description: "Local", name: "Local", profileId: "local" }
    });
    expect(invoke).toHaveBeenCalledWith("update_agent_template", {
      request: {
        budgetCents: 200,
        description: "Local",
        harnessProfileId: null,
        modelId: "gpt-5.2",
        name: "Local",
        providerId: "openai",
        role: "developer",
        skillRoutes: [],
        templateId: "local"
      }
    });
    expect(invoke).toHaveBeenCalledWith("promote_agent_training_run", {
      request: { trainingRunId: "train-release" }
    });
    expect(invoke).toHaveBeenCalledWith("update_workspace_git_context", {
      request: { branch: "main", path: "D:\\repo", workspaceId: "repo" }
    });
    expect(invoke).toHaveBeenCalledWith("refresh_workspace_git_status", {
      request: { workspaceId: "repo" }
    });
    expect(invoke).toHaveBeenCalledWith("update_workspace_loadout", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        workspaceId: "repo"
      }
    });
    expect(invoke).toHaveBeenCalledWith("start_run", {
      request: {
        agentTemplateId: "developer-pi",
        harnessProfileId: "pi-execution-discipline",
        id: "run-1",
        task: "Build",
        workspaceId: "repo"
      }
    });
  });

  it("rejects when the Electron bridge is unavailable", async () => {
    await expect(electronMissionControlInvoke("mission_control_snapshot")).rejects.toThrow(
      "AgenticCrew Electron bridge unavailable"
    );
  });
});
