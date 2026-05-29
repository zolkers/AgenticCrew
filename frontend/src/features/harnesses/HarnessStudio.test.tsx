import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
              piExtensionCount: 1,
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
    const effectiveHarness = screen.getByRole("heading", { name: "Effective harness" }).closest("section");
    expect(effectiveHarness).not.toBeNull();
    expect(within(effectiveHarness as HTMLElement).getByText("PI extensions").closest("div")).toHaveTextContent("1");
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

  it("includes active PI extensions in fallback effective harness previews", () => {
    const profile = profileFixture("profile-on", true);

    render(
      <HarnessStudio
        invoke={vi.fn()}
        snapshot={{
          activePiExtensionCount: 1,
          activeProfileCount: 1,
          bindings: [],
          piExtensions: [
            {
              active: true,
              description: "Release policy",
              id: "release-pi",
              inspected: true,
              modules: [
                {
                  content: "Require release validation.",
                  enabled: true,
                  id: "release-pi/base-policy",
                  kind: "base_policy",
                  name: "Base Policy",
                  source: {
                    route: "agenticcrew://pi/local/release-pi",
                    sourceId: "release-pi",
                    trustLevel: "local"
                  },
                  version: "1"
                }
              ],
              name: "Release PI",
              route: "agenticcrew://pi/local/release-pi"
            }
          ],
          profiles: [profile]
        }}
      />
    );

    expect(screen.getByText(/Require release validation/u)).toBeInTheDocument();
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

  it("imports PI extensions without activating them", async () => {
    const nextSnapshot: HarnessStudioSnapshot = {
      activePiExtensionCount: 0,
      activeProfileCount: 1,
      bindings: [],
      piExtensions: [
        {
          active: false,
          description: "Release policy",
          id: "release-pi",
          inspected: true,
          modules: [],
          name: "Release PI",
          route: "agenticcrew://pi/local/release-pi"
        }
      ],
      profiles: [profileFixture("profile-on", true)]
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

    fireEvent.change(screen.getByLabelText("PI name"), { target: { value: "Release PI" } });
    fireEvent.change(screen.getByLabelText("PI description"), { target: { value: "Release policy" } });
    fireEvent.change(screen.getByLabelText("PI base policy"), { target: { value: "Require release evidence." } });
    fireEvent.click(screen.getByRole("button", { name: "Import PI extension" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("import_pi_extension", {
      request: {
        agentPersona: null,
        basePolicy: "Require release evidence.",
        behaviorRules: [],
        description: "Release policy",
        id: "release-pi",
        name: "Release PI",
        outputStyle: null,
        projectMemory: null,
        safetyRules: [],
        toolRules: []
      }
    });
  });

  it("activates imported PI extensions separately", async () => {
    const nextSnapshot: HarnessStudioSnapshot = {
      activePiExtensionCount: 1,
      activeProfileCount: 1,
      bindings: [],
      piExtensions: [piExtensionFixture("release-pi", true)],
      profiles: [profileFixture("profile-on", true)]
    };
    const invoke = vi.fn().mockResolvedValue(nextSnapshot);

    render(
      <HarnessStudio
        invoke={invoke}
        snapshot={{
          activePiExtensionCount: 0,
          activeProfileCount: 1,
          bindings: [],
          piExtensions: [piExtensionFixture("release-pi", false)],
          profiles: [profileFixture("profile-on", true)]
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Activate PI" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("set_pi_extension_active", {
        request: {
          active: true,
          extensionId: "release-pi"
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

function piExtensionFixture(id: string, active: boolean) {
  return {
    active,
    description: "Release policy",
    id,
    inspected: true,
    modules: [],
    name: "Release PI",
    route: `agenticcrew://pi/local/${id}`
  };
}
