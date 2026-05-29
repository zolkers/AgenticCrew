import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import type { SettingsSnapshot } from "../../shared/types/core";

describe("SettingsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders redacted provider settings", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5.1"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("ChatGPT provider selected")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.1")).toBeInTheDocument();
    expect(screen.getByText("Configured ending in 1234")).toBeInTheDocument();
  });

  it("renders missing key and non-openai provider metadata", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        displayName: "Local",
        providerId: "local",
        selectedModelId: "local-model"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByText("local")).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });

  it("renders a fallback suffix when the api key metadata is incomplete", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: null,
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByText("Configured ending in ****")).toBeInTheDocument();
  });

  it("saves model changes without resending the current api key", async () => {
    const nextSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5.2"
      }
    };
    const invoke = vi.fn().mockResolvedValue(nextSnapshot);
    const onSnapshotChange = vi.fn();

    render(
      <SettingsPanel
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "gpt-5.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("update_ai_provider_settings", {
      request: {
        apiKey: undefined,
        providerId: "openai",
        selectedModelId: "gpt-5.2"
      }
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("can replace and clear the api key metadata", async () => {
    const updatedSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "9999",
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    };
    const clearedSnapshot: SettingsSnapshot = {
      aiProvider: {
        ...updatedSnapshot.aiProvider,
        apiKeyConfigured: false,
        apiKeyLastFour: null
      }
    };
    const invoke = vi.fn().mockResolvedValueOnce(updatedSnapshot).mockResolvedValueOnce(clearedSnapshot);

    render(
      <SettingsPanel
        invoke={invoke}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "sk-proj-secret9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("update_ai_provider_settings", {
        request: {
          apiKey: "sk-proj-secret9999",
          providerId: "openai",
          selectedModelId: "gpt-5"
        }
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear key" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenLastCalledWith("update_ai_provider_settings", {
        request: {
          apiKey: "",
          providerId: "openai",
          selectedModelId: "gpt-5"
        }
      });
    });
  });

  it("reports save and clear failures", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("failed"));

    render(
      <SettingsPanel
        invoke={invoke}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "sk-proj-secret9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Settings update failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear key" }));

    expect(await screen.findByText("API key clear failed")).toBeInTheDocument();
  });
});
