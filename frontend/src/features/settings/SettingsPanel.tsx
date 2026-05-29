import { useMemo, useState } from "react";
import { Check, KeyRound, LockKeyhole, RadioTower, RefreshCw, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { syncProviderModels, updateAiProviderSettings, type InvokeSettings } from "../../shared/api/settingsApi";
import type { SettingsSnapshot } from "../../shared/types/core";

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
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const modelOptions = useMemo(() => {
    const availableModels = provider.availableModels ?? [
      { id: provider.selectedModelId, label: provider.selectedModelId, providerId: provider.providerId }
    ];

    if (availableModels.some((option) => option.id === provider.selectedModelId)) {
      return availableModels;
    }

    return [
      { id: provider.selectedModelId, label: provider.selectedModelId, providerId: provider.providerId },
      ...availableModels
    ];
  }, [provider.availableModels, provider.providerId, provider.selectedModelId]);
  const keyStatus = provider.apiKeyConfigured
    ? `Configured ending in ${provider.apiKeyLastFour ?? "****"}`
    : "Not configured";
  const hasPendingChange = modelId !== provider.selectedModelId || apiKey.trim().length > 0;
  const syncStatus = getModelSyncStatus(provider);

  async function saveProviderSettings() {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const nextSnapshot = await updateAiProviderSettings(invoke, {
        apiKey: apiKey.trim().length > 0 ? apiKey : undefined,
        providerId: provider.providerId,
        selectedModelId: modelId
      });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
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
        providerId: provider.providerId,
        selectedModelId: modelId
      });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
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
      const nextSnapshot = await syncProviderModels(invoke, { providerId: provider.providerId });
      onSnapshotChange?.(nextSnapshot);
      setModelId(nextSnapshot.aiProvider.selectedModelId);
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
          <small>{syncStatus}</small>
        </article>
        <article className="surface-card">
          <KeyRound aria-hidden="true" size={20} />
          <strong>API key</strong>
          <span>{keyStatus}</span>
        </article>
        <article className="surface-card">
          <LockKeyhole aria-hidden="true" size={20} />
          <strong>Harness</strong>
          <span>Workspace binding required</span>
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
          <span>API key</span>
          <input
            autoComplete="off"
            disabled={saving}
            onChange={(event) => {
              setApiKey(event.target.value);
              setSaved(false);
            }}
            placeholder={provider.apiKeyConfigured ? "Leave empty to keep current key" : "sk-..."}
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
