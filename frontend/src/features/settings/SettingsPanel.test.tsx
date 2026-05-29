import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import type { AiModelRecord, SettingsSnapshot } from "../../shared/types/core";

const openAiModels: AiModelRecord[] = [
  { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
  { id: "gpt-5.1", label: "GPT-5.1", providerId: "openai" },
  { id: "gpt-5", label: "GPT-5", providerId: "openai" }
];

describe("SettingsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders redacted provider settings", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        availableModels: openAiModels,
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5.1"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("ChatGPT provider selected")).toBeInTheDocument();
    expect(screen.getAllByText("gpt-5.1").length).toBeGreaterThan(0);
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

  it("renders model choices from the provider registry", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        availableModels: [
          { id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" },
          { id: "gpt-5-mini", label: "GPT-5 mini", providerId: "openai" }
        ],
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-5-mini"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByRole("option", { name: "GPT-5.2" })).toHaveValue("gpt-5.2");
    expect(screen.getByRole("option", { name: "GPT-5 mini" })).toHaveValue("gpt-5-mini");
  });

  it("keeps the selected model visible when the provider registry omits it", () => {
    const snapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        availableModels: [{ id: "gpt-5.2", label: "GPT-5.2", providerId: "openai" }],
        displayName: "OpenAI",
        providerId: "openai",
        selectedModelId: "gpt-legacy"
      }
    };

    render(<SettingsPanel invoke={vi.fn()} snapshot={snapshot} />);

    expect(screen.getByRole("option", { name: "gpt-legacy" })).toHaveValue("gpt-legacy");
    expect(screen.getByRole("option", { name: "GPT-5.2" })).toHaveValue("gpt-5.2");
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
        availableModels: openAiModels,
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
            availableModels: openAiModels,
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

  it("syncs provider models and surfaces provider status", async () => {
    const syncedSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        availableModels: openAiModels,
        displayName: "OpenAI",
        modelSyncError: null,
        modelSyncStatus: "synced",
        modelsLastSyncedAt: "sync-1",
        providerId: "openai",
        selectedModelId: "gpt-5.2"
      }
    };
    const invoke = vi.fn().mockResolvedValue(syncedSnapshot);
    const onSnapshotChange = vi.fn();

    render(
      <SettingsPanel
        invoke={invoke}
        onSnapshotChange={onSnapshotChange}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            availableModels: openAiModels,
            displayName: "OpenAI",
            modelSyncStatus: "never_synced",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    expect(screen.getByText("Not synced")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    await waitFor(() => {
      expect(onSnapshotChange).toHaveBeenCalledWith(syncedSnapshot);
    });
    expect(invoke).toHaveBeenCalledWith("sync_provider_models", {
      request: { apiKey: undefined, providerId: "openai" }
    });
  });

  it("passes a typed API key only as transient sync input", async () => {
    const syncedSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "9999",
        availableModels: [{ id: "gpt-live", label: "gpt-live", providerId: "openai" }],
        displayName: "OpenAI",
        modelSyncError: null,
        modelSyncStatus: "synced",
        modelsLastSyncedAt: "sync-2",
        providerId: "openai",
        selectedModelId: "gpt-live"
      }
    };
    const invoke = vi.fn().mockResolvedValue(syncedSnapshot);

    render(
      <SettingsPanel
        invoke={invoke}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: false,
            apiKeyLastFour: null,
            availableModels: openAiModels,
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "sk-proj-secret9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("sync_provider_models", {
        request: { apiKey: "sk-proj-secret9999", providerId: "openai" }
      });
    });
    expect(screen.getByLabelText("API key")).toHaveValue("");
  });

  it("surfaces recoverable model sync failures from the provider", async () => {
    const failedSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        availableModels: openAiModels,
        displayName: "OpenAI",
        modelSyncError: "OpenAI API key is required before syncing models",
        modelSyncStatus: "failed",
        modelsLastSyncedAt: null,
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    };
    const invoke = vi.fn().mockResolvedValue(failedSnapshot);

    render(
      <SettingsPanel
        invoke={invoke}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: false,
            apiKeyLastFour: null,
            availableModels: openAiModels,
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(await screen.findByText("OpenAI API key is required before syncing models")).toBeInTheDocument();
  });

  it("renders compact sync status fallbacks", async () => {
    const failedSnapshot: SettingsSnapshot = {
      aiProvider: {
        apiKeyConfigured: true,
        apiKeyLastFour: "1234",
        availableModels: openAiModels,
        displayName: "OpenAI",
        modelSyncError: null,
        modelSyncStatus: "failed",
        modelsLastSyncedAt: null,
        providerId: "openai",
        selectedModelId: "gpt-5"
      }
    };

    const { rerender } = render(
      <SettingsPanel
        invoke={vi.fn().mockResolvedValue(failedSnapshot)}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            availableModels: openAiModels,
            displayName: "OpenAI",
            modelSyncError: null,
            modelSyncStatus: "synced",
            modelsLastSyncedAt: null,
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    expect(screen.getByText("Synced")).toBeInTheDocument();

    rerender(
      <SettingsPanel
        invoke={vi.fn().mockResolvedValue(failedSnapshot)}
        snapshot={{
          aiProvider: {
            ...failedSnapshot.aiProvider
          }
        }}
      />
    );

    expect(screen.getByText("Model sync failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    await waitFor(() => {
      expect(screen.getAllByText("Model sync failed")).toHaveLength(2);
    });
  });

  it("reports rejected model sync commands", async () => {
    render(
      <SettingsPanel
        invoke={vi.fn().mockRejectedValue(new Error("offline"))}
        snapshot={{
          aiProvider: {
            apiKeyConfigured: true,
            apiKeyLastFour: "1234",
            availableModels: openAiModels,
            displayName: "OpenAI",
            providerId: "openai",
            selectedModelId: "gpt-5"
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(await screen.findByText("Model sync failed")).toBeInTheDocument();
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
