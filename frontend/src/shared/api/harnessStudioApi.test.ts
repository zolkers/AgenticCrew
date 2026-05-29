import { describe, expect, it } from "vitest";
import { loadHarnessStudioSnapshot } from "./harnessStudioApi";

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
});
