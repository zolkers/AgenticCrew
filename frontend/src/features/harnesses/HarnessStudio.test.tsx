import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HarnessStudio } from "./HarnessStudio";
import type { DiscoveredSkillManifest, HarnessStudioSnapshot } from "../../shared/types/core";

const availableSkillRoutes: DiscoveredSkillManifest[] = [
  {
    description: "Plan work safely",
    id: "superpowers/planning",
    name: "planning",
    relativePath: "skills/planning/SKILL.md",
    route: "agenticcrew://skills/superpowers/planning"
  }
];

describe("HarnessStudio", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the empty state", () => {
    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{ activeProfileCount: 0, bindings: [], profiles: [] }}
      />
    );

    expect(screen.getByRole("heading", { name: "Harness Studio" })).toBeInTheDocument();
    expect(screen.getByText("No harness profile registered")).toBeInTheDocument();
  });

  it("renders inactive harness profiles", () => {
    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activeProfileCount: 0,
          bindings: [],
          profiles: [
            {
              active: false,
              description: "Inactive profile",
              id: "profile-off",
              modules: [],
              name: "Profile Off",
              skillRoutes: [],
              version: "1"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Profile Off")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders bound skill routes on harness profiles", () => {
    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activeProfileCount: 1,
          bindings: [],
          profiles: [
            {
              ...profileFixture("profile-on", true),
              skillRoutes: ["agenticcrew://skills/review"]
            }
          ]
        }}
      />
    );

    expect(screen.getByText("agenticcrew://skills/review")).toBeInTheDocument();
  });

  it("renders Rust-provided effective harness previews", () => {
    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activeProfileCount: 1,
          bindings: [],
          effectiveHarnesses: [
            {
              enabledModuleCount: 2,
              preview: "Use project rules.\n\nRequire validation.",
              profileId: "profile-on",
              profileName: "Profile On",
              skillRouteCount: 1
            }
          ],
          profiles: [profileFixture("profile-on", true)]
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Effective harness" })).toBeInTheDocument();
    expect(screen.getByText("Profile On")).toBeInTheDocument();
    expect(screen.getByText(/Use project rules/u)).toBeInTheDocument();
  });

  it("derives an effective harness preview when older snapshots omit it", () => {
    const profile = profileFixture("profile-on", true);

    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activeProfileCount: 1,
          bindings: [],
          profiles: [{ ...profile, modules: [{ ...profile.modules[0], content: "" }] }]
        }}
      />
    );

    expect(screen.getByText("No enabled module content")).toBeInTheDocument();
  });

  it("creates a local harness profile", async () => {
    const nextSnapshot: HarnessStudioSnapshot = {
      activeProfileCount: 2,
      bindings: [],
      profiles: [
        profileFixture("pi-execution-discipline", true),
        profileFixture("workspace-harness", true)
      ]
    };
    const invoke = vi.fn().mockResolvedValue(nextSnapshot);
    const onSnapshotChange = vi.fn();

    render(
      <HarnessStudio
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={{ activeProfileCount: 1, bindings: [], profiles: [profileFixture("pi-execution-discipline", true)] }}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Review_1-Harness" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Review flow" } });
    fireEvent.change(screen.getByLabelText("Base policy"), {
      target: { value: "Require review before merge." }
    });
    fireEvent.change(screen.getByLabelText("Skill routes"), {
      target: { value: "agenticcrew://skills/review\n\n agenticcrew://skills/planning " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create harness" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("create_harness_profile", {
      request: {
        active: true,
        basePolicy: "Require review before merge.",
        description: "Review flow",
        id: "review_1-harness",
        name: "Review_1-Harness",
        skillRoutes: ["agenticcrew://skills/review", "agenticcrew://skills/planning"]
      }
    });
  });

  it("adds discovered marketplace skill routes to the harness form", async () => {
    const invoke = vi.fn().mockResolvedValue({ activeProfileCount: 0, bindings: [], profiles: [] });

    render(
      <HarnessStudio
        availableSkillRoutes={availableSkillRoutes}
        invoke={invoke}
        snapshot={{ activeProfileCount: 0, bindings: [], profiles: [] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    expect(screen.getByLabelText("Skill routes")).toHaveValue("agenticcrew://skills/superpowers/planning");
    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    expect(screen.getByLabelText("Skill routes")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /planning/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create harness" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("create_harness_profile", {
        request: {
          active: true,
          basePolicy: "Validate before final claims.",
          description: "Local execution profile for this workspace.",
          id: "workspace-harness",
          name: "Workspace Harness",
          skillRoutes: ["agenticcrew://skills/superpowers/planning"]
        }
      });
    });
  });

  it("reports harness creation failures", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("failed"));

    render(
      <HarnessStudio
        invoke={invoke}
        snapshot={{ activeProfileCount: 1, bindings: [], profiles: [profileFixture("profile-on", true)] }}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Broken Harness" } });
    fireEvent.click(screen.getByRole("button", { name: "Create harness" }));

    expect(await screen.findByText("Harness creation failed")).toBeInTheDocument();
  });

  it("edits an existing harness profile", async () => {
    const nextSnapshot: HarnessStudioSnapshot = {
      activeProfileCount: 1,
      bindings: [],
      profiles: [
        {
          ...profileFixture("profile-on", true),
          description: "Updated profile",
          name: "Updated Harness",
          version: "2"
        }
      ]
    };
    const invoke = vi.fn().mockResolvedValue(nextSnapshot);
    const onSnapshotChange = vi.fn();

    render(
      <HarnessStudio
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={{ activeProfileCount: 1, bindings: [], profiles: [profileFixture("profile-on", true)] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Route")).toHaveValue("agenticcrew://harnesses/local/profile-on");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated Harness" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Updated profile" } });
    fireEvent.change(screen.getByLabelText("Base policy"), { target: { value: "Require evidence." } });
    fireEvent.click(screen.getByRole("button", { name: "Save harness" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("update_harness_profile", {
      request: {
        basePolicy: "Require evidence.",
        description: "Updated profile",
        name: "Updated Harness",
        profileId: "profile-on",
        skillRoutes: []
      }
    });
  });

  it("reports harness update failures", async () => {
    render(
      <HarnessStudio
        invoke={vi.fn().mockRejectedValue(new Error("failed"))}
        snapshot={{ activeProfileCount: 1, bindings: [], profiles: [profileFixture("profile-on", true)] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save harness" }));

    expect(await screen.findByText("Harness update failed")).toBeInTheDocument();
  });

  it("prefills an empty base policy when a profile has no base policy module", () => {
    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activeProfileCount: 1,
          bindings: [],
          profiles: [{ ...profileFixture("profile-on", true), modules: [] }]
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Base policy")).toHaveValue("");
  });

  it("toggles harness profile activation and reports failures", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce({
      activeProfileCount: 0,
      bindings: [],
      profiles: [profileFixture("profile-on", false)]
    });

    render(
      <HarnessStudio
        invoke={invoke}
        snapshot={{ activeProfileCount: 1, bindings: [], profiles: [profileFixture("profile-on", true)] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Harness status update failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenLastCalledWith("set_harness_profile_active", {
        request: {
          active: false,
          profileId: "profile-on"
        }
      });
    });
  });
});

function profileFixture(id: string, active: boolean) {
  return {
    active,
    description: "Harness profile",
    id,
    modules: [
      {
        content: "Validate.",
        enabled: true,
        id: `${id}/base-policy`,
        kind: "base_policy" as const,
        name: "Base Policy",
        source: {
          route: `agenticcrew://harnesses/local/${id}`,
          sourceId: "local",
          trustLevel: "local" as const
        },
        version: "1"
      }
    ],
    name: id,
    skillRoutes: [],
    version: "1"
  };
}
