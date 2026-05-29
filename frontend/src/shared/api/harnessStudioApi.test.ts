import { describe, expect, it } from "vitest";
import {
  createHarnessProfile,
  importPiExtension,
  loadHarnessStudioSnapshot,
  setHarnessProfileActive,
  setPiExtensionActive,
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

  it("imports and activates PI extensions through the injected invoke", async () => {
    const snapshot = {
      activePiExtensionCount: 1,
      activeProfileCount: 1,
      bindings: [],
      piExtensions: [],
      profiles: []
    };
    const importRequest = {
      agentPersona: null,
      basePolicy: "Require release evidence",
      behaviorRules: [],
      description: "Release review",
      id: "release-pi",
      name: "Release PI",
      outputStyle: null,
      projectMemory: null,
      safetyRules: [],
      toolRules: []
    };

    await expect(
      importPiExtension((command, args) => {
        expect(command).toBe("import_pi_extension");
        expect(args).toEqual({ request: importRequest });
        return Promise.resolve(snapshot);
      }, importRequest)
    ).resolves.toEqual(snapshot);

    await expect(
      setPiExtensionActive((command, args) => {
        expect(command).toBe("set_pi_extension_active");
        expect(args).toEqual({
          request: {
            active: true,
            extensionId: "release-pi"
          }
        });
        return Promise.resolve(snapshot);
      }, {
        active: true,
        extensionId: "release-pi"
      })
    ).resolves.toEqual(snapshot);
  });
});
