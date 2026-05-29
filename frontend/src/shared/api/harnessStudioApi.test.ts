import { describe, expect, it } from "vitest";
import {
  createHarnessProfile,
  loadHarnessStudioSnapshot,
  setHarnessProfileActive,
  updateHarnessProfile
} from "./harnessStudioApi";

describe("harnessStudioApi", () => {
  it("loads the Rust harness_studio_snapshot command through the injected invoke", async () => {
    const snapshot = {
      activeProfileCount: 1,
      bindings: [],
      profiles: []
    };

    await expect(
      loadHarnessStudioSnapshot((command) => {
        expect(command).toBe("harness_studio_snapshot");
        return Promise.resolve(snapshot);
      })
    ).resolves.toEqual(snapshot);
  });

  it("creates and toggles harness profiles through the injected invoke", async () => {
    const snapshot = {
      activeProfileCount: 1,
      bindings: [],
      profiles: []
    };
    const invoke = (command: string, args?: Record<string, unknown>) => {
      expect(["create_harness_profile", "set_harness_profile_active"]).toContain(command);
      expect(args).toHaveProperty("request");

      return Promise.resolve(snapshot);
    };

    await expect(
      createHarnessProfile(invoke, {
        active: true,
        basePolicy: "Validate",
        description: "Local",
        id: "local",
        name: "Local",
        skillRoutes: []
      })
    ).resolves.toEqual(snapshot);
    await expect(
      setHarnessProfileActive(invoke, {
        active: false,
        profileId: "local"
      })
    ).resolves.toEqual(snapshot);
  });

  it("updates a harness profile through the injected invoke", async () => {
    const snapshot = {
      activeProfileCount: 1,
      bindings: [],
      profiles: []
    };
    const request = {
      basePolicy: "Require evidence",
      description: "Updated harness",
      name: "Review Harness",
      profileId: "local",
      skillRoutes: []
    };

    await expect(
      updateHarnessProfile((command, args) => {
        expect(command).toBe("update_harness_profile");
        expect(args).toEqual({ request });
        return Promise.resolve(snapshot);
      }, request)
    ).resolves.toEqual(snapshot);
  });
});
