import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    expect(screen.getByText("superpowers")).toBeInTheDocument();
    expect(screen.getByText("1 source matches")).toBeInTheDocument();
    expect(screen.getByText("0 skills indexed")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getAllByText("External").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending validation").length).toBeGreaterThan(0);
    expect(screen.getByText("Never synced")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/obra/superpowers")).toBeInTheDocument();
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

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByText("C:/AgenticCrew/cache/skills/superpowers")).toBeInTheDocument();
    expect(screen.getByText("git fetch failed")).toBeInTheDocument();
    expect(screen.getByText("planning")).toBeInTheDocument();
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
    expect(screen.getByText("legacy")).toBeInTheDocument();
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
    expect(screen.getByText("superpowers")).toBeInTheDocument();
    expect(screen.queryByText("local-pack")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "pending_validation" } });
    fireEvent.change(screen.getByLabelText("Filter trust"), { target: { value: "local" } });
    expect(screen.getByText("local-pack")).toBeInTheDocument();
    expect(screen.queryByText("superpowers")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "no-match" } });
    expect(screen.getByText("No skill source matches")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<SkillSources snapshot={{ activeSourceCount: 0, sources: [] }} />);

    expect(screen.getByText("No external skill source registered")).toBeInTheDocument();
  });
});
