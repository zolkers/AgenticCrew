import { describe, expect, it } from "vitest";
import {
  approveSkillSourcePermissions,
  activateSkillSource,
  inspectCachedSkillSource,
  loadSkillSourcesSnapshot,
  registerGitHubSkillSource,
  syncGitHubSkillSource
} from "./skillSourcesApi";
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

  it("registers a GitHub skill source through the Rust command", async () => {
    const calls: unknown[] = [];
    const request = {
      id: "superpowers",
      repositoryUrl: "https://github.com/obra/superpowers",
      selectedRef: "main"
    };

    await registerGitHubSkillSource((command, args) => {
      calls.push({ args, command });
      return Promise.resolve({});
    }, request);

    expect(calls).toEqual([
      {
        args: { request },
        command: "register_github_skill_source"
      }
    ]);
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

  it("inspects cached skill manifests through the Rust command", async () => {
    const calls: unknown[] = [];

    await inspectCachedSkillSource((command, args) => {
      calls.push({ args, command });
      return Promise.resolve({});
    }, "superpowers");

    expect(calls).toEqual([
      {
        args: { sourceId: "superpowers" },
        command: "inspect_cached_skill_source"
      }
    ]);
  });

  it("activates a skill source through the Rust command", async () => {
    const calls: unknown[] = [];

    await activateSkillSource((command, args) => {
      calls.push({ args, command });
      return Promise.resolve({});
    }, "superpowers");

    expect(calls).toEqual([
      {
        args: { sourceId: "superpowers" },
        command: "activate_skill_source"
      }
    ]);
  });
});
