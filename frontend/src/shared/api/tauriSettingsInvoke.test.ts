import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriSettingsInvoke } from "./tauriSettingsInvoke";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriSettingsInvoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards settings commands and args", async () => {
    vi.mocked(invoke).mockResolvedValue({
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    });

    await expect(
      tauriSettingsInvoke("update_ai_provider_settings", {
        request: {
          apiKey: "sk-proj-1234",
          providerId: "openai",
          selectedModelId: "gpt-5.1"
        }
      })
    ).resolves.toMatchObject({ aiProvider: { providerId: "openai" } });

    expect(invoke).toHaveBeenCalledWith("update_ai_provider_settings", {
      request: {
        apiKey: "sk-proj-1234",
        providerId: "openai",
        selectedModelId: "gpt-5.1"
      }
    });
  });
});
