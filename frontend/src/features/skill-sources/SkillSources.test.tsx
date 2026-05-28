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
          id: "superpowers",
          kind: "git_hub",
          lastSyncStatus: "never_synced",
          repositoryUrl: "https://github.com/obra/superpowers",
          selectedRef: "main",
          status: "pending_validation",
          trustLevel: "external"
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
    expect(screen.getByText("https://github.com/obra/superpowers")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<SkillSources snapshot={{ activeSourceCount: 0, sources: [] }} />);

    expect(screen.getByText("No external skill source registered")).toBeInTheDocument();
  });
});
