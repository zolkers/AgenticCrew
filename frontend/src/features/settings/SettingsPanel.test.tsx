import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import type { SettingsSnapshot } from "../../shared/types/core";

describe("SettingsPanel", () => {
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
});
