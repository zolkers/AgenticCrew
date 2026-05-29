import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SkillSourcesSnapshot } from "../../shared/types/core";
import "../../i18n";
import { SkillSources } from "./SkillSources";

describe("SkillSources", () => {
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
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("External")).toBeInTheDocument();
    expect(screen.getByText("Pending validation")).toBeInTheDocument();
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
              relativePath: "skills/planning/SKILL.md"
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
    expect(screen.getByText("Plan work safely")).toBeInTheDocument();
    expect(screen.getByText("skills/bad/SKILL.md")).toBeInTheDocument();
    expect(screen.getByText("missing required frontmatter field 'description'")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<SkillSources snapshot={{ activeSourceCount: 0, sources: [] }} />);

    expect(screen.getByText("No external skill source registered")).toBeInTheDocument();
  });
});
