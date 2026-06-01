import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillSourcesSnapshot } from "../../shared/types/core";
import "../../i18n";
import { SkillSources } from "./SkillSources";

describe("SkillSources", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the registered GitHub skill source with provenance and status", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: [
        {
          active: false,
          discoveredSkills: [],
          id: "superpowers",
          kind: "git_hub",
          lastSyncError: null,
          lastSyncStatus: "never_synced",
          lastSyncedCommit: null,
          localCachePath: null,
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "pending_validation",
          trustLevel: "external",
          validationErrors: []
        }
      ]
    };

    render(<SkillSources snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
    expect(screen.getAllByText("superpowers").length).toBeGreaterThan(0);
    expect(screen.getByText("1 matching")).toBeInTheDocument();
    expect(screen.getByText("0 skills indexed")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getAllByText("External").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending validation").length).toBeGreaterThan(0);
    expect(screen.getByText("Never synced")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(screen.getAllByText("https://github.com/obra/superpowers").length).toBeGreaterThan(0);
  });

  it("renders sync cache provenance and validation errors", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: [
        {
          active: false,
          discoveredSkills: [
            {
              description: "Plan work safely",
              id: "superpowers/planning",
              name: "planning",
              relativePath: "skills/planning/SKILL.md",
              route: "agenticcrew://skills/superpowers/planning"
            }
          ],
          id: "superpowers",
          kind: "git_hub",
          lastSyncError: "git fetch failed",
          lastSyncStatus: "failed",
          lastSyncedCommit: "abc123",
          localCachePath: "C:/AgenticCrew/cache/skills/superpowers",
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "sync_failed",
          trustLevel: "external",
          validationErrors: [
            {
              message: "missing required frontmatter field 'description'",
              relativePath: "skills/bad/SKILL.md"
            }
          ]
        }
      ]
    };

    render(<SkillSources snapshot={snapshot} />);

    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByText("C:/AgenticCrew/cache/skills/superpowers")).toBeInTheDocument();
    expect(screen.getByText("git fetch failed")).toBeInTheDocument();
    expect(screen.getAllByText("planning").length).toBeGreaterThan(0);
    expect(screen.getByText("1 skills indexed")).toBeInTheDocument();
    expect(screen.getByText("agenticcrew://skills/superpowers/planning")).toBeInTheDocument();
    expect(screen.getByText("Plan work safely")).toBeInTheDocument();
    expect(screen.getByText("skills/bad/SKILL.md")).toBeInTheDocument();
    expect(screen.getByText("missing required frontmatter field 'description'")).toBeInTheDocument();
  });

  it("renders approved permission gates", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 1,
      sources: [
        {
          active: true,
          discoveredSkills: [],
          id: "local",
          kind: "local",
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: null,
          localCachePath: null,
          permissionGate: {
            approved: true,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "validated",
          trustLevel: "local",
          validationErrors: []
        }
      ]
    };

    render(<SkillSources snapshot={snapshot} />);

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByLabelText("Active source")).toBeInTheDocument();
  });

  it("handles legacy sources without discovered skill arrays", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: [
        {
          active: false,
          id: "legacy",
          kind: "local",
          lastSyncError: null,
          lastSyncStatus: "never_synced",
          lastSyncedCommit: null,
          localCachePath: null,
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "file:///legacy",
          selectedRef: "local",
          status: "pending_validation",
          trustLevel: "local",
          validationErrors: []
        }
      ]
    };

    render(<SkillSources snapshot={snapshot} />);

    expect(screen.getByText("0 skills indexed")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "legacy" } });
    expect(screen.getAllByText("legacy").length).toBeGreaterThan(0);
  });

  it("filters sources by skill search, status, and trust", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 1,
      sources: [
        {
          active: false,
          discoveredSkills: [
            {
              description: "Searchable browser skill",
              id: "superpowers/browser",
              name: "browser",
              relativePath: "skills/browser/SKILL.md",
              route: "agenticcrew://skills/superpowers/browser"
            }
          ],
          id: "superpowers",
          kind: "git_hub",
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: null,
          localCachePath: null,
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "validated",
          trustLevel: "external",
          validationErrors: []
        },
        {
          active: true,
          discoveredSkills: [],
          id: "local-pack",
          kind: "local",
          lastSyncError: null,
          lastSyncStatus: "never_synced",
          lastSyncedCommit: null,
          localCachePath: null,
          permissionGate: {
            approved: true,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "file:///skills",
          selectedRef: "local",
          status: "pending_validation",
          trustLevel: "local",
          validationErrors: []
        }
      ]
    };

    render(<SkillSources snapshot={snapshot} />);

    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "browser" } });
    expect(screen.getAllByText("superpowers").length).toBeGreaterThan(0);
    expect(screen.queryByText("local-pack")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Needs review" }));
    expect(screen.getAllByText("local-pack").length).toBeGreaterThan(0);
    expect(screen.queryByText("superpowers")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "no-match" } });
    expect(screen.getByText("No skill source matches")).toBeInTheDocument();
  });

  it("switches selected sources and skill previews", () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 1,
      sources: [
        {
          active: true,
          discoveredSkills: [],
          id: "local-pack",
          kind: "local",
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: null,
          localCachePath: "C:/AgenticCrew/cache/skills/local-pack",
          permissionGate: {
            approved: true,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "file:///skills",
          selectedRef: "local",
          status: "validated",
          trustLevel: "local",
          validationErrors: []
        },
        {
          active: false,
          discoveredSkills: [
            {
              description: "Build implementation plans",
              id: "external-pack/planning",
              name: "planning",
              relativePath: "skills/planning/SKILL.md",
              route: "agenticcrew://skills/external-pack/planning"
            },
            {
              description: "Debug failures systematically",
              id: "external-pack/debugger",
              name: "debugger",
              relativePath: "skills/debugger/SKILL.md",
              route: "agenticcrew://skills/external-pack/debugger"
            }
          ],
          id: "external-pack",
          kind: "git_hub",
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: "def456",
          localCachePath: "C:/AgenticCrew/cache/skills/external-pack",
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/example/skills",
          selectedRef: "main",
          status: "validated",
          trustLevel: "external",
          validationErrors: []
        }
      ]
    };

    render(<SkillSources invoke={() => Promise.resolve(snapshot)} snapshot={snapshot} />);

    expect(screen.getByRole("button", { name: "Active" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /external-pack/u }));

    expect(screen.getByLabelText("Skill preview")).toHaveTextContent("planning");
    expect(screen.getByLabelText("Skill preview")).toHaveTextContent("Build implementation plans");

    fireEvent.click(screen.getByText("debugger").closest("button") as HTMLElement);

    expect(screen.getByLabelText("Skill preview")).toHaveTextContent("debugger");
    expect(screen.getByLabelText("Skill preview")).toHaveTextContent("Debug failures systematically");
  });

  it("renders the empty state", () => {
    render(<SkillSources snapshot={{ activeSourceCount: 0, sources: [] }} />);

    expect(screen.getByText("No external skill source registered")).toBeInTheDocument();
  });

  it("edits the GitHub source registration form before submitting", async () => {
    const invoke = vi.fn().mockResolvedValue({ activeSourceCount: 0, sources: [] });

    render(
      <SkillSources
        invoke={invoke}
        snapshot={{ activeSourceCount: 0, sources: [] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    fireEvent.change(screen.getByLabelText("Source id"), { target: { value: " team-skills " } });
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: " https://github.com/team/agentic-skills " }
    });
    fireEvent.change(screen.getByLabelText("Ref"), { target: { value: " v1.2.3 " } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("register_github_skill_source", {
        request: {
          id: "team-skills",
          repositoryUrl: "https://github.com/team/agentic-skills",
          selectedRef: "v1.2.3"
        }
      });
    });
  });

  it("registers, syncs, approves, and activates sources through the command boundary", async () => {
    const source = {
      active: false,
      discoveredSkills: [],
      id: "superpowers",
      kind: "git_hub" as const,
      lastSyncError: null,
      lastSyncStatus: "never_synced" as const,
      lastSyncedCommit: null,
      localCachePath: null,
      permissionGate: {
        approved: false,
        policy: {
          commands: [],
          docker: false,
          fileSystem: [],
          git: false,
          network: []
        }
      },
      repositoryUrl: "https://github.com/obra/superpowers",
      selectedRef: "main",
      status: "pending_validation" as const,
      trustLevel: "external" as const,
      validationErrors: []
    };
    let snapshot: SkillSourcesSnapshot = { activeSourceCount: 0, sources: [] };
    const calls: unknown[] = [];
    const invoke = (command: string, args?: unknown) => {
      calls.push({ args, command });
      if (command === "register_github_skill_source") {
        snapshot = { activeSourceCount: 0, sources: [source] };
      }
      if (command === "sync_github_skill_source" || command === "inspect_cached_skill_source") {
        snapshot = {
          activeSourceCount: 0,
          sources: [
            {
              ...source,
              discoveredSkills: [
                {
                  description: "Plan work safely",
                  id: "superpowers/planning",
                  name: "planning",
                  relativePath: "skills/planning/SKILL.md",
                  route: "agenticcrew://skills/superpowers/planning"
                }
              ],
              lastSyncStatus: "synced",
              localCachePath: "cache/superpowers",
              status: "validated"
            }
          ]
        };
      }
      if (command === "approve_skill_source_permissions") {
        snapshot = {
          ...snapshot,
          sources: snapshot.sources.map((item) => ({
            ...item,
            permissionGate: { ...item.permissionGate, approved: true }
          }))
        };
      }
      if (command === "activate_skill_source") {
        snapshot = {
          activeSourceCount: 1,
          sources: snapshot.sources.map((item) => ({ ...item, active: true }))
        };
      }
      if (command === "skill_sources_snapshot") {
        return Promise.resolve(snapshot);
      }
      return Promise.resolve({});
    };
    const onSnapshotChange = vi.fn((nextSnapshot: SkillSourcesSnapshot) => {
      snapshot = nextSnapshot;
    });
    const { rerender } = render(
      <SkillSources invoke={invoke} onSnapshotChange={onSnapshotChange} snapshot={snapshot} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith({ activeSourceCount: 0, sources: [source] });
    });

    rerender(<SkillSources invoke={invoke} onSnapshotChange={onSnapshotChange} snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Sync source" }));
    await waitFor(() => {
      expect(snapshot.sources[0].discoveredSkills?.[0]?.name).toBe("planning");
    });
    rerender(<SkillSources invoke={invoke} onSnapshotChange={onSnapshotChange} snapshot={snapshot} />);
    expect(screen.getAllByText("planning").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Review permissions" }));
    await waitFor(() => {
      expect(snapshot.sources[0].permissionGate.approved).toBe(true);
    });

    rerender(<SkillSources invoke={invoke} onSnapshotChange={onSnapshotChange} snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    await waitFor(() => {
      expect(snapshot.activeSourceCount).toBe(1);
    });

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: "register_github_skill_source" }),
        expect.objectContaining({ command: "sync_github_skill_source" }),
        expect.objectContaining({ command: "approve_skill_source_permissions" }),
        expect.objectContaining({ command: "activate_skill_source" })
      ])
    );
  });

  it("surfaces source action failures", async () => {
    const snapshot: SkillSourcesSnapshot = {
      activeSourceCount: 0,
      sources: [
        {
          active: false,
          discoveredSkills: [],
          id: "superpowers",
          kind: "git_hub",
          lastSyncError: null,
          lastSyncStatus: "synced",
          lastSyncedCommit: null,
          localCachePath: "cache/superpowers",
          permissionGate: {
            approved: false,
            policy: {
              commands: [],
              docker: false,
              fileSystem: [],
              git: false,
              network: []
            }
          },
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "validated",
          trustLevel: "external",
          validationErrors: []
        }
      ]
    };
    const invoke = vi.fn().mockRejectedValue(new Error("offline"));

    render(<SkillSources invoke={invoke} snapshot={snapshot} />);

    fireEvent.click(screen.getByRole("button", { name: "Inspect source" }));

    expect(await screen.findByText("Skill source inspection failed")).toBeInTheDocument();
  });
});
