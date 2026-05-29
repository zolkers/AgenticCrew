import { describe, expect, it } from "vitest";
import { approveSkillSourcePermissions, loadSkillSourcesSnapshot, syncGitHubSkillSource } from "./skillSourcesApi";
import type { ApprovedPermissionPolicy, SkillSourcesSnapshot } from "../types/core";

describe("loadSkillSourcesSnapshot", () => {
  it("loads the Rust skill_sources_snapshot command through the injected invoke", async () => {
    const rustSnapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: []
    };

    const snapshot = await loadSkillSourcesSnapshot((command) => {
      expect(command).toBe("skill_sources_snapshot");
      return Promise.resolve(rustSnapshot);
    });

    expect(snapshot).toEqual(rustSnapshot);
  });

  it("approves permission scopes for a skill source through the Rust command", async () => {
    const policy: ApprovedPermissionPolicy = {
      commands: [{ command: "git" }],
      docker: false,
      fileSystem: [{ path: "workspaces/research", writable: true }],
      git: true,
      network: [{ host: "api.github.com" }]
    };
    const calls: unknown[] = [];

    await approveSkillSourcePermissions(
      (command, args) => {
        calls.push({ args, command });
        return Promise.resolve({});
      },
      "superpowers",
      policy
    );

    expect(calls).toEqual([
      {
        args: { policy, sourceId: "superpowers" },
        command: "approve_skill_source_permissions"
      }
    ]);
  });

  it("syncs a GitHub skill source through the Rust command", async () => {
    const calls: unknown[] = [];

    await syncGitHubSkillSource((command, args) => {
      calls.push({ args, command });
      return Promise.resolve({});
    }, "superpowers");

    expect(calls).toEqual([
      {
        args: { sourceId: "superpowers" },
        command: "sync_github_skill_source"
      }
    ]);
  });
});
