import { useState } from "react";
import { Brain, Check, KeyRound, RadioTower, RefreshCw, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { syncProviderModels, updateAiProviderSettings, type InvokeSettings } from "../../shared/api/settingsApi";
import type { AiProviderOption, ReasoningEffort, SettingsSnapshot } from "../../shared/types/core";

type SettingsPanelProps = Readonly<{
  invoke: InvokeSettings;
  onSnapshotChange?: (snapshot: SettingsSnapshot) => void;
  snapshot: SettingsSnapshot;
}>;

export function SettingsPanel({ invoke, onSnapshotChange, snapshot }: SettingsPanelProps) {
  const provider = snapshot.aiProvider;
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<null | string>(null);
  const [modelId, setModelId] = useState(provider.selectedModelId);
  const [providerId, setProviderId] = useState(provider.providerId);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(provider.reasoningEffort ?? "medium");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const providerOptions = provider.providerOptions ?? defaultProviderOptions(provider);
  const selectedProviderOption =
    providerOptions.find((option) => option.providerId === providerId) ?? providerOptions[0];
  const availableModels = selectedProviderOption.models;
  const modelOptions = availableModels.some((option) => option.id === modelId)
    ? availableModels
    : [{ id: modelId, label: modelId, providerId }, ...availableModels];
  const keyStatus = provider.apiKeyConfigured
    ? `Configured ending in ${provider.apiKeyLastFour ?? "****"}`
    : "Not configured";
  const hasPendingChange =
    modelId !== provider.selectedModelId ||
    providerId !== provider.providerId ||
    reasoningEffort !== (provider.reasoningEffort ?? "medium") ||
    apiKey.trim().length > 0;
  const syncStatus = getModelSyncStatus(provider);

  async function saveProviderSettings() {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const nextSnapshot = await updateAiProviderSettings(invoke, {
        apiKey: apiKey.trim().length > 0 ? apiKey : undefined,
        providerId,
        reasoningEffort,
        selectedModelId: modelId
      });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
      setProviderId(nextSnapshot.aiProvider.providerId);
      setReasoningEffort(nextSnapshot.aiProvider.reasoningEffort ?? "medium");
      setApiKey("");
      setSaved(true);
    } catch {
      setError("Settings update failed");
    } finally {
      setSaving(false);
    }
  }

  async function clearApiKey() {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const nextSnapshot = await updateAiProviderSettings(invoke, {
        apiKey: "",
        providerId,
        reasoningEffort,
        selectedModelId: modelId
      });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
      setProviderId(nextSnapshot.aiProvider.providerId);
      setReasoningEffort(nextSnapshot.aiProvider.reasoningEffort ?? "medium");
      setApiKey("");
      setSaved(true);
    } catch {
      setError("API key clear failed");
    } finally {
      setSaving(false);
    }
  }

  async function syncModels() {
    setError(null);
    setSaved(false);
    setSyncing(true);

    try {
      const nextSnapshot = await syncProviderModels(invoke, {
        apiKey: apiKey.trim().length > 0 ? apiKey : undefined,
        providerId
      });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
      setProviderId(nextSnapshot.aiProvider.providerId);
      setReasoningEffort(nextSnapshot.aiProvider.reasoningEffort ?? "medium");
      setApiKey("");
      setSaved(nextSnapshot.aiProvider.modelSyncStatus === "synced");
      if (nextSnapshot.aiProvider.modelSyncStatus === "failed") {
        setError(nextSnapshot.aiProvider.modelSyncError ?? "Model sync failed");
      }
    } catch {
      setError("Model sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section aria-label="Settings">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Provider</p>
          <h2>Settings</h2>
        </div>
        <strong>{provider.displayName}</strong>
      </header>

      <div className="surface-grid">
        <article className="surface-card">
          <RadioTower aria-hidden="true" size={20} />
          <strong>Connection</strong>
          <span>{provider.providerId === "openai" ? "ChatGPT provider selected" : provider.providerId}</span>
        </article>
        <article className="surface-card">
          <SlidersHorizontal aria-hidden="true" size={20} />
          <strong>Model</strong>
          <span>{provider.selectedModelId}</span>
          <small>{formatReasoningEffort(provider.reasoningEffort ?? "medium")}</small>
          <small>{syncStatus}</small>
        </article>
        <article className="surface-card">
          <KeyRound aria-hidden="true" size={20} />
          <strong>API key</strong>
          <span>{keyStatus}</span>
        </article>
        <article className="surface-card">
          <Brain aria-hidden="true" size={20} />
          <strong>Thinking</strong>
          <span>{formatReasoningEffort(provider.reasoningEffort ?? "medium")}</span>
        </article>
      </div>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveProviderSettings();
        }}
      >
        <label>
          <span>Provider</span>
          <select
            disabled={saving}
            onChange={(event) => {
              const nextProviderId = event.target.value;
              const nextProvider = providerOptions.find((option) => option.providerId === nextProviderId);
              setProviderId(nextProviderId);
              setModelId(nextProvider?.defaultModelId ?? nextProvider?.models[0]?.id ?? "");
              setSaved(false);
            }}
            value={providerId}
          >
            {providerOptions.map((option) => (
              <option key={option.providerId} value={option.providerId}>
                {option.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Model</span>
          <select
            disabled={saving}
            onChange={(event) => {
              setModelId(event.target.value);
              setSaved(false);
            }}
            value={modelId}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Thinking</span>
          <select
            disabled={saving}
            onChange={(event) => {
              setReasoningEffort(event.target.value as ReasoningEffort);
              setSaved(false);
            }}
            value={reasoningEffort}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>API key</span>
          <input
            autoComplete="off"
            disabled={saving}
            onChange={(event) => {
              setApiKey(event.target.value);
              setSaved(false);
            }}
            placeholder={provider.apiKeyConfigured ? "Leave empty to keep current key" : getApiKeyPlaceholder(providerId)}
            type="password"
            value={apiKey}
          />
        </label>
        <div className="settings-actions">
          <button disabled={saving || !hasPendingChange} type="submit">
            <Save aria-hidden="true" size={16} />
            <span>{saving ? "Saving" : "Save"}</span>
          </button>
          <button
            disabled={saving || syncing}
            onClick={() => {
              void syncModels();
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
            <span>{syncing ? "Syncing" : "Sync"}</span>
          </button>
          <button
            disabled={saving || !provider.apiKeyConfigured}
            onClick={() => {
              void clearApiKey();
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
            <span>Clear key</span>
          </button>
          {saved ? (
            <output aria-live="polite" className="settings-status">
              <Check aria-hidden="true" size={16} />
              Saved
            </output>
          ) : null}
          {error ? (
            <output aria-live="polite" className="settings-error">
              {error}
            </output>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function getModelSyncStatus(provider: SettingsSnapshot["aiProvider"]): string {
  if (provider.modelSyncStatus === "synced") {
    return `Synced ${provider.modelsLastSyncedAt ?? ""}`.trim();
  }

  if (provider.modelSyncStatus === "failed") {
    return provider.modelSyncError ?? "Model sync failed";
  }

  return "Not synced";
}

function defaultProviderOptions(provider: SettingsSnapshot["aiProvider"]): AiProviderOption[] {
  return [
    {
      defaultModelId: provider.selectedModelId,
      displayName: provider.displayName,
      models: provider.availableModels ?? [
        { id: provider.selectedModelId, label: provider.selectedModelId, providerId: provider.providerId }
      ],
      providerId: provider.providerId
    }
  ];
}

function formatReasoningEffort(reasoningEffort: ReasoningEffort): string {
  return reasoningEffort[0].toUpperCase() + reasoningEffort.slice(1);
}

function getApiKeyPlaceholder(providerId: string): string {
  return providerId === "gemini" ? "AIza..." : "sk-...";
}
