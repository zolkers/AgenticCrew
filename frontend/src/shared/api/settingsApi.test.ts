import { describe, expect, it } from "vitest";
import { loadSettingsSnapshot, updateAiProviderSettings } from "./settingsApi";
import type { SettingsSnapshot } from "../types/core";

describe("settingsApi", () => {
  it("loads the settings snapshot through the invoke boundary", async () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    };

    await expect(loadSettingsSnapshot((command) => {
      expect(command).toBe("settings_snapshot");
      return Promise.resolve(snapshot);
    })).resolves.toEqual(snapshot);
  });

  it("updates provider settings through a named request payload", async () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5.1"
      }
    };

    await expect(
      updateAiProviderSettings((command, args) => {
        expect(command).toBe("update_ai_provider_settings");
        expect(args).toEqual({
          request: {
            apiKey: "sk-proj-1234",
            providerId: "openai",
            selectedModelId: "gpt-5.1"
          }
        });
        return Promise.resolve(snapshot);
      }, {
        apiKey: "sk-proj-1234",
        providerId: "openai",
        selectedModelId: "gpt-5.1"
      })
    ).resolves.toEqual(snapshot);
  });
});
