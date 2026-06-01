import { useMemo, useState } from "react";
import { Bot, Edit3, Plus, Power, Route, X } from "lucide-react";
import {
  createAgentTemplate,
  setAgentTemplateActive,
  updateAgentTemplate,
  type InvokeAgentStudio
} from "../../shared/api/agentStudioApi";
import type {
  AgentStudioSnapshot,
  AgentTemplate,
  AiModelRecord,
  DiscoveredSkillManifest,
  HarnessStudioSnapshot,
  ReasoningEffort
} from "../../shared/types/core";

type AgentStudioProps = Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  harnessSnapshot: HarnessStudioSnapshot;
  invoke: InvokeAgentStudio;
  modelOptions?: readonly AiModelRecord[];
  onSnapshotChange?: (snapshot: AgentStudioSnapshot) => void;
  snapshot: AgentStudioSnapshot;
}>;

export function AgentStudio({
  availableSkillRoutes,
  harnessSnapshot,
  invoke,
  modelOptions,
  onSnapshotChange,
  snapshot
}: AgentStudioProps) {
  const [budgetDollars, setBudgetDollars] = useState("2.00");
  const [description, setDescription] = useState("Custom workspace agent.");
  const [editingTemplateId, setEditingTemplateId] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);
  const [harnessProfileId, setHarnessProfileId] = useState(harnessSnapshot.profiles[0]?.id ?? "");
  const [isEditorOpen, setIsEditorOpen] = useState(snapshot.templates.length === 0);
  const [selectedTemplateId, setSelectedTemplateId] = useState(snapshot.templates[0]?.id ?? "");
  const defaultModelId = firstAvailableModelId(modelOptions, snapshot);
  const defaultProviderId = firstAvailableProviderId(modelOptions, snapshot);
  const [modelId, setModelId] = useState(defaultModelId);
  const [name, setName] = useState("Review Agent");
  const [providerId, setProviderId] = useState(defaultProviderId);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("medium");
  const [role, setRole] = useState("reviewer");
  const [saving, setSaving] = useState(false);
  const [skillRoutesText, setSkillRoutesText] = useState("agenticcrew://skills/superpowers/subagent-driven-development");
  const availableModels = modelOptions ?? [];
  const providerOptions = uniqueProviders(availableModels, snapshot);
  const modelsForProvider = availableModels.filter((model) => model.providerId === providerId);
  const modelSelectOptions =
    modelsForProvider.some((model) => model.id === modelId) || modelId.length === 0
      ? modelsForProvider
      : [{ id: modelId, label: modelId, providerId }, ...modelsForProvider];
  const selectedSkillRoutes = splitSkillRoutes(skillRoutesText);
  const generatedId = useMemo(() => slugify(name), [name]);
  const selectedTemplate = snapshot.templates.find((template) => template.id === selectedTemplateId) ?? snapshot.templates[0];
  const submitLabel = saving ? "Saving" : getAgentSubmitLabel(editingTemplateId);

  async function submitAgentTemplate() {
    setError(null);
    setSaving(true);

    try {
      const request = {
        budgetCents: Math.round(Number.parseFloat(budgetDollars || "0") * 100),
        description,
        harnessProfileId: harnessProfileId.length > 0 ? harnessProfileId : null,
        modelId,
        name,
        providerId,
        reasoningEffort,
        role,
        skillRoutes: splitSkillRoutes(skillRoutesText)
      };
      const nextSnapshot =
        editingTemplateId === null
          ? await createAgentTemplate(invoke, {
              ...request,
              active: true,
              id: generatedId
            })
          : await updateAgentTemplate(invoke, {
              ...request,
              templateId: editingTemplateId
            });
      onSnapshotChange?.(nextSnapshot);
      resetForm();
      setIsEditorOpen(false);
    } catch {
      setError(editingTemplateId === null ? "Agent creation failed" : "Agent update failed");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(template: AgentTemplate) {
    setEditingTemplateId(template.id);
    setName(template.name);
    setRole(template.role);
    setDescription(template.description);
    setModelId(template.modelId);
    setProviderId(template.providerId);
    setReasoningEffort(template.reasoningEffort ?? "medium");
    setHarnessProfileId(template.harnessProfileId ?? "");
    setBudgetDollars((template.budgetCents / 100).toFixed(2));
    setSkillRoutesText(template.skillRoutes.join("\n"));
    setError(null);
    setIsEditorOpen(true);
  }

  function resetForm(options: { close?: boolean } = {}) {
    setEditingTemplateId(null);
    setName("Review Agent");
    setRole("reviewer");
    setDescription("Custom workspace agent.");
    setModelId(defaultModelId);
    setProviderId(defaultProviderId);
    setReasoningEffort("medium");
    setHarnessProfileId(harnessSnapshot.profiles[0]?.id ?? "");
    setBudgetDollars("2.00");
    setSkillRoutesText("agenticcrew://skills/superpowers/subagent-driven-development");
    setError(null);
    if (options.close === true && snapshot.templates.length > 0) {
      setIsEditorOpen(false);
    }
  }

  function beginCreate() {
    resetForm();
    setIsEditorOpen(true);
  }

  function toggleSkillRoute(route: string) {
    const routeSet = new Set(selectedSkillRoutes);

    if (routeSet.has(route)) {
      routeSet.delete(route);
    } else {
      routeSet.add(route);
    }

    setSkillRoutesText([...routeSet].join("\n"));
  }

  async function toggleAgentTemplate(templateId: string, active: boolean) {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await setAgentTemplateActive(invoke, { active, templateId });
      onSnapshotChange?.(nextSnapshot);
    } catch {
      setError("Agent status update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Agent Profiles">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Custom agents</p>
          <h2>Agent Profiles</h2>
        </div>
        <div className="studio-header-actions">
          <strong>{snapshot.activeTemplateCount} active</strong>
          <button className="inline-action primary" onClick={beginCreate} type="button">
            <Plus aria-hidden="true" size={16} />
            <span>New agent</span>
          </button>
        </div>
      </header>
      {error && !isEditorOpen ? (
        <output aria-live="polite" className="settings-error studio-error">
          {error}
        </output>
      ) : null}
      {snapshot.templates.length === 0 ? (
        <p>No custom agent saved</p>
      ) : (
        <>
        <div className="surface-grid compact">
          <article className="surface-card">
            <Bot aria-hidden="true" size={20} />
            <strong>Templates</strong>
            <span>{snapshot.templates.length}</span>
          </article>
          <article className="surface-card">
            <Route aria-hidden="true" size={20} />
            <strong>Skill routes</strong>
            <span>{snapshot.templates.reduce((count, template) => count + template.skillRoutes.length, 0)}</span>
          </article>
        </div>
        <AgentTemplateBrowser
          onEdit={beginEdit}
          onSelect={setSelectedTemplateId}
          onToggleActive={(template) => {
            void toggleAgentTemplate(template.id, !template.active);
          }}
          saving={saving}
          selectedTemplate={selectedTemplate}
          templates={snapshot.templates}
        />
        </>
      )}
      {isEditorOpen ? (
        <AgentEditorPanel
          availableSkillRoutes={availableSkillRoutes}
          budgetDollars={budgetDollars}
          description={description}
          editingTemplateId={editingTemplateId}
          error={error}
          generatedId={generatedId}
          harnessProfileId={harnessProfileId}
          harnessSnapshot={harnessSnapshot}
          modelId={modelId}
          modelSelectOptions={modelSelectOptions}
          name={name}
          onBudgetChange={setBudgetDollars}
          onClose={() => {
            resetForm({ close: true });
          }}
          onPromptChange={setDescription}
          onHarnessChange={setHarnessProfileId}
          onModelChange={setModelId}
          onNameChange={setName}
          onProviderChange={(nextProviderId) => {
            const nextModelId = availableModels.find((model) => model.providerId === nextProviderId)?.id ?? "";
            setProviderId(nextProviderId);
            setModelId(nextModelId);
          }}
          onReasoningEffortChange={setReasoningEffort}
          onRoleChange={setRole}
          onSkillRoutesChange={setSkillRoutesText}
          onSubmit={submitAgentTemplate}
          providerId={providerId}
          providerOptions={providerOptions}
          reasoningEffort={reasoningEffort}
          role={role}
          saving={saving}
          selectedSkillRoutes={selectedSkillRoutes}
          shouldShowClose={snapshot.templates.length > 0}
          skillRoutesText={skillRoutesText}
          submitLabel={submitLabel}
          toggleSkillRoute={toggleSkillRoute}
        />
      ) : null}
    </section>
  );
}

type AgentEditorPanelProps = Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  budgetDollars: string;
  description: string;
  editingTemplateId: null | string;
  error: null | string;
  generatedId: string;
  harnessProfileId: string;
  harnessSnapshot: HarnessStudioSnapshot;
  modelId: string;
  modelSelectOptions: readonly AiModelRecord[];
  name: string;
  onBudgetChange: (value: string) => void;
  onClose: () => void;
  onPromptChange: (value: string) => void;
  onHarnessChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onReasoningEffortChange: (value: ReasoningEffort) => void;
  onRoleChange: (value: string) => void;
  onSkillRoutesChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  providerId: string;
  providerOptions: readonly ProviderOption[];
  reasoningEffort: ReasoningEffort;
  role: string;
  saving: boolean;
  selectedSkillRoutes: readonly string[];
  shouldShowClose: boolean;
  skillRoutesText: string;
  submitLabel: string;
  toggleSkillRoute: (route: string) => void;
}>;

type ProviderOption = Readonly<{
  displayName: string;
  providerId: string;
}>;

function AgentEditorPanel({
  availableSkillRoutes,
  budgetDollars,
  description,
  editingTemplateId,
  error,
  generatedId,
  harnessProfileId,
  harnessSnapshot,
  modelId,
  modelSelectOptions,
  name,
  onBudgetChange,
  onClose,
  onPromptChange,
  onHarnessChange,
  onModelChange,
  onNameChange,
  onProviderChange,
  onReasoningEffortChange,
  onRoleChange,
  onSkillRoutesChange,
  onSubmit,
  providerId,
  providerOptions,
  reasoningEffort,
  role,
  saving,
  selectedSkillRoutes,
  shouldShowClose,
  skillRoutesText,
  submitLabel,
  toggleSkillRoute
}: AgentEditorPanelProps) {
  const isCreating = editingTemplateId === null;

  return (
    <section aria-label={isCreating ? "Create agent panel" : "Edit agent panel"} className="studio-editor-panel">
      <header>
        <div>
          <p className="eyebrow">{isCreating ? "New custom agent" : "Edit custom agent"}</p>
          <h3>{isCreating ? "Create agent" : "Save agent changes"}</h3>
        </div>
        {shouldShowClose ? (
          <button className="icon-action" disabled={saving} onClick={onClose} type="button">
            <X aria-hidden="true" size={16} />
            <span>Close</span>
          </button>
        ) : null}
      </header>
      <dl className="studio-editor-summary">
        <div>
          <dt>Model</dt>
          <dd>{providerId} / {modelId || "No model"}</dd>
        </div>
        <div>
          <dt>Thinking</dt>
          <dd>{formatReasoningEffort(reasoningEffort)}</dd>
        </div>
        <div>
          <dt>Harness</dt>
          <dd>{harnessProfileId || "None"}</dd>
        </div>
        <div>
          <dt>Skills</dt>
          <dd>{selectedSkillRoutes.length}</dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>${Number.parseFloat(budgetDollars || "0").toFixed(2)}</dd>
        </div>
      </dl>
      <form
        className="agent-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label>
          <span>Name</span>
          <input disabled={saving} onChange={(event) => { onNameChange(event.target.value); }} value={name} />
        </label>
        <label>
          <span>Route</span>
          <input disabled readOnly value={`agenticcrew://agents/local/${editingTemplateId ?? generatedId}`} />
        </label>
        <label>
          <span>Role</span>
          <input disabled={saving} onChange={(event) => { onRoleChange(event.target.value); }} value={role} />
        </label>
        <label>
          <span>Provider</span>
          <select disabled={saving} onChange={(event) => { onProviderChange(event.target.value); }} value={providerId}>
            {providerOptions.map((provider) => (
              <option key={provider.providerId} value={provider.providerId}>
                {provider.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Model</span>
          <select disabled={saving} onChange={(event) => { onModelChange(event.target.value); }} value={modelId}>
            {modelSelectOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Thinking</span>
          <select
            disabled={saving}
            onChange={(event) => { onReasoningEffortChange(event.target.value as ReasoningEffort); }}
            value={reasoningEffort}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Harness</span>
          <select disabled={saving} onChange={(event) => { onHarnessChange(event.target.value); }} value={harnessProfileId}>
            <option value="">None</option>
            {harnessSnapshot.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Budget</span>
          <input
            disabled={saving}
            min="0"
            onChange={(event) => { onBudgetChange(event.target.value); }}
            step="0.01"
            type="number"
            value={budgetDollars}
          />
        </label>
        <label>
          <span>Prompt</span>
          <input disabled={saving} onChange={(event) => { onPromptChange(event.target.value); }} value={description} />
        </label>
        <label>
          <span>Skill routes</span>
          <textarea disabled={saving} onChange={(event) => { onSkillRoutesChange(event.target.value); }} value={skillRoutesText} />
        </label>
        <SkillRoutePicker
          availableSkillRoutes={availableSkillRoutes}
          saving={saving}
          selectedSkillRoutes={selectedSkillRoutes}
          toggleSkillRoute={toggleSkillRoute}
        />
        <div className="settings-actions">
          <button disabled={saving || modelId.length === 0 || (isCreating && generatedId.length === 0)} type="submit">
            <Plus aria-hidden="true" size={16} />
            <span>{submitLabel}</span>
          </button>
          {isCreating ? null : (
            <button disabled={saving} onClick={onClose} type="button">
              <X aria-hidden="true" size={16} />
              <span>Cancel</span>
            </button>
          )}
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

function SkillRoutePicker({
  availableSkillRoutes,
  saving,
  selectedSkillRoutes,
  toggleSkillRoute
}: Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  saving: boolean;
  selectedSkillRoutes: readonly string[];
  toggleSkillRoute: (route: string) => void;
}>) {
  if (availableSkillRoutes === undefined || availableSkillRoutes.length === 0) {
    return null;
  }

  return (
    <div aria-label="Available skill routes" className="route-picker">
      {availableSkillRoutes.map((skill) => {
        const selected = selectedSkillRoutes.includes(skill.route);

        return (
          <button
            aria-pressed={selected}
            disabled={saving}
            key={skill.route}
            onClick={() => {
              toggleSkillRoute(skill.route);
            }}
            type="button"
          >
            <Route aria-hidden="true" size={14} />
            <span>{skill.name}</span>
            <code>{skill.route}</code>
          </button>
        );
      })}
    </div>
  );
}

type AgentTemplateBrowserProps = Readonly<{
  onEdit: (template: AgentTemplate) => void;
  onSelect: (templateId: string) => void;
  onToggleActive: (template: AgentTemplate) => void;
  saving: boolean;
  selectedTemplate: AgentTemplate;
  templates: readonly AgentTemplate[];
}>;

function AgentTemplateBrowser({
  onEdit,
  onSelect,
  onToggleActive,
  saving,
  selectedTemplate,
  templates
}: AgentTemplateBrowserProps) {
  return (
    <div className="agent-studio-layout">
      <nav className="agent-roster-panel" aria-label="Agent templates">
        {templates.map((template) => (
          <button
            aria-pressed={selectedTemplate.id === template.id}
            key={template.id}
            onClick={() => {
              onSelect(template.id);
            }}
            type="button"
          >
            <span className={`status-dot status-dot-${template.active ? "active" : "queued"}`} aria-hidden="true" />
            <span>
              <strong>{template.name}</strong>
              <small>
                {template.role} / v{template.version}
              </small>
            </span>
            <code>{template.modelId}</code>
          </button>
        ))}
      </nav>
      <article className="agent-detail-panel" aria-label="Selected agent details">
        <header>
          <div>
            <p className="eyebrow">Selected agent</p>
            <h3>{selectedTemplate.name}</h3>
            <span>
              {selectedTemplate.role} / {selectedTemplate.active ? "active" : "inactive"}
            </span>
          </div>
          <div className="agent-detail-actions">
            <button
              className="inline-action"
              disabled={saving}
              onClick={() => {
                onToggleActive(selectedTemplate);
              }}
              type="button"
            >
              <Power aria-hidden="true" size={16} />
              <span>{selectedTemplate.active ? "Deactivate" : "Activate"}</span>
            </button>
            <button
              className="inline-action"
              disabled={saving}
              onClick={() => {
                onEdit(selectedTemplate);
              }}
              type="button"
            >
              <Edit3 aria-hidden="true" size={16} />
              <span>Edit</span>
            </button>
          </div>
        </header>
        <dl>
          <div>
            <dt>Model</dt>
            <dd>
              {selectedTemplate.providerId} / {selectedTemplate.modelId}
            </dd>
          </div>
          <div>
            <dt>Thinking</dt>
            <dd>{formatReasoningEffort(selectedTemplate.reasoningEffort ?? "medium")}</dd>
          </div>
          <div>
            <dt>Harness</dt>
            <dd>{selectedTemplate.harnessProfileId ?? "None"}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>${(selectedTemplate.budgetCents / 100).toFixed(2)}</dd>
          </div>
        </dl>
        <div className="agent-prompt-preview">
          <strong>Prompt</strong>
          <p>{selectedTemplate.description}</p>
        </div>
        <ul className="pill-list compact-pills" aria-label={`${selectedTemplate.name} skill routes`}>
          {selectedTemplate.skillRoutes.length === 0 ? <li>No skill route</li> : null}
          {selectedTemplate.skillRoutes.map((route) => (
            <li key={route}>{route}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function splitSkillRoutes(value: string): string[] {
  return value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((route) => route.trim())
    .filter((route) => route.length > 0);
}

function getAgentSubmitLabel(editingTemplateId: null | string): string {
  return editingTemplateId === null ? "Create agent" : "Save agent";
}

function firstAvailableModelId(modelOptions: readonly AiModelRecord[] | undefined, snapshot: AgentStudioSnapshot): string {
  if (modelOptions !== undefined && modelOptions.length > 0) {
    return modelOptions[0].id;
  }

  return snapshot.templates[0]?.modelId ?? "";
}

function firstAvailableProviderId(modelOptions: readonly AiModelRecord[] | undefined, snapshot: AgentStudioSnapshot): string {
  if (modelOptions !== undefined && modelOptions.length > 0) {
    return modelOptions[0].providerId;
  }

  return snapshot.templates[0]?.providerId ?? "openai";
}

function uniqueProviders(
  modelOptions: readonly AiModelRecord[],
  snapshot: AgentStudioSnapshot
): ProviderOption[] {
  const providerIds = [
    ...modelOptions.map((model) => model.providerId),
    ...snapshot.templates.map((template) => template.providerId)
  ];
  const uniqueProviderIds = [...new Set(providerIds.length > 0 ? providerIds : ["openai"])];

  return uniqueProviderIds.map((providerId) => ({
    displayName: providerDisplayName(providerId),
    providerId
  }));
}

function providerDisplayName(providerId: string): string {
  if (providerId === "openai") {
    return "OpenAI";
  }

  if (providerId === "gemini") {
    return "Gemini";
  }

  return providerId;
}

function formatReasoningEffort(reasoningEffort: ReasoningEffort): string {
  return reasoningEffort[0].toUpperCase() + reasoningEffort.slice(1);
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => (isSlugCharacter(character) ? character : "-"))
    .join("");

  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .join("-");
}

function isSlugCharacter(character: string): boolean {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "0" && character <= "9") ||
    character === "_" ||
    character === "-"
  );
}
