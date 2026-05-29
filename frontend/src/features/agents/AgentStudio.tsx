import { useMemo, useState } from "react";
import { Bot, Edit3, FlaskConical, Plus, Power, Route, Trophy, X } from "lucide-react";
import {
  createAgentTemplate,
  promoteAgentTrainingRun,
  setAgentTemplateActive,
  updateAgentTemplate,
  type InvokeAgentStudio
} from "../../shared/api/agentStudioApi";
import type {
  AgentStudioSnapshot,
  AgentTemplate,
  AiModelRecord,
  DiscoveredSkillManifest,
  HarnessStudioSnapshot
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
  const defaultModelId = firstAvailableModelId(modelOptions, snapshot);
  const [modelId, setModelId] = useState(defaultModelId);
  const [name, setName] = useState("Review Agent");
  const [role, setRole] = useState("reviewer");
  const [saving, setSaving] = useState(false);
  const [skillRoutesText, setSkillRoutesText] = useState("agenticcrew://skills/superpowers/subagent-driven-development");
  const availableModels = modelOptions ?? [];
  const modelSelectOptions =
    availableModels.some((model) => model.id === modelId) || modelId.length === 0
      ? availableModels
      : [{ id: modelId, label: modelId, providerId: "openai" }, ...availableModels];
  const selectedSkillRoutes = splitSkillRoutes(skillRoutesText);
  const evaluationRuns = snapshot.evaluationRuns ?? [];
  const versionSummaries = snapshot.versionSummaries ?? agentVersionSummaries(snapshot);
  const generatedId = useMemo(() => slugify(name), [name]);
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
        providerId: "openai",
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
    setHarnessProfileId(template.harnessProfileId ?? "");
    setBudgetDollars((template.budgetCents / 100).toFixed(2));
    setSkillRoutesText(template.skillRoutes.join("\n"));
    setError(null);
  }

  function resetForm() {
    setEditingTemplateId(null);
    setName("Review Agent");
    setRole("reviewer");
    setDescription("Custom workspace agent.");
    setModelId(defaultModelId);
    setHarnessProfileId(harnessSnapshot.profiles[0]?.id ?? "");
    setBudgetDollars("2.00");
    setSkillRoutesText("agenticcrew://skills/superpowers/subagent-driven-development");
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

  async function promoteTrainingRun(trainingRunId: string) {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await promoteAgentTrainingRun(invoke, { trainingRunId });
      onSnapshotChange?.(nextSnapshot);
    } catch {
      setError("Training promotion failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Agent Studio">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Custom agents</p>
          <h2>Agent Studio</h2>
        </div>
        <strong>{snapshot.activeTemplateCount} active</strong>
      </header>
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
          <article className="surface-card">
            <FlaskConical aria-hidden="true" size={20} />
            <strong>Training</strong>
            <span>{snapshot.trainingRuns.length} runs</span>
          </article>
          <article className="surface-card">
            <Trophy aria-hidden="true" size={20} />
            <strong>Evaluation</strong>
            <span>{evaluationRuns.length} evaluations</span>
          </article>
        </div>
        <ul className="surface-list">
          {snapshot.templates.map((template) => (
            <li key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>
                  {template.role} / v{template.version}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Model</dt>
                  <dd>
                    {template.providerId} / {template.modelId}
                  </dd>
                </div>
                <div>
                  <dt>Harness</dt>
                  <dd>{template.harnessProfileId ?? "None"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>${(template.budgetCents / 100).toFixed(2)}</dd>
                </div>
              </dl>
              <p>{template.description}</p>
              <ul className="pill-list">
                {template.skillRoutes.map((route) => (
                  <li key={route}>{route}</li>
                ))}
              </ul>
              <button
                className="inline-action"
                disabled={saving}
                onClick={() => {
                  void toggleAgentTemplate(template.id, !template.active);
                }}
                type="button"
              >
                <Power aria-hidden="true" size={16} />
                <span>{template.active ? "Deactivate" : "Activate"}</span>
              </button>
              <button
                className="inline-action"
                disabled={saving}
                onClick={() => {
                  beginEdit(template);
                }}
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
                <span>Edit</span>
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
      {versionSummaries.length > 0 ? (
        <section aria-labelledby="version-ledger-title" className="version-ledger">
          <header>
            <Trophy aria-hidden="true" size={18} />
            <h3 id="version-ledger-title">Version ledger</h3>
          </header>
          <ul className="surface-list">
            {versionSummaries.map((summary) => (
              <li key={summary.templateId}>
                <div>
                  <strong>{summary.templateName}</strong>
                  <span>
                    v{summary.currentVersion} / {summary.active ? "active" : "inactive"}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Latest training</dt>
                    <dd>{summary.latestTrainingStatus ?? "none"}</dd>
                  </div>
                  <div>
                    <dt>Promotions</dt>
                    <dd>{summary.promotedTrainingCount}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {snapshot.trainingRuns.length > 0 ? (
        <section aria-labelledby="training-lane-title" className="training-lane">
          <header>
            <FlaskConical aria-hidden="true" size={18} />
            <h3 id="training-lane-title">Training lane</h3>
          </header>
          <ul className="surface-list">
            {snapshot.trainingRuns.map((run) => (
              <li key={run.id}>
                <div>
                  <strong>{run.datasetId}</strong>
                  <span>
                    {run.agentTemplateId} / {run.status}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Critic</dt>
                    <dd>{run.criticScore ?? "Pending"}</dd>
                  </div>
                  <div>
                    <dt>Promoted</dt>
                    <dd>
                      {run.promotedVersion === null || run.promotedVersion === undefined
                        ? "No"
                        : `v${String(run.promotedVersion)}`}
                    </dd>
                  </div>
                </dl>
                {run.status === "completed" &&
                (run.promotedVersion === null || run.promotedVersion === undefined) ? (
                  <button
                    aria-label={`Promote training run ${run.datasetId}`}
                    className="icon-action"
                    disabled={saving}
                    onClick={() => {
                      void promoteTrainingRun(run.id);
                    }}
                    title="Promote"
                    type="button"
                  >
                    <Trophy aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {evaluationRuns.length > 0 ? (
        <section aria-labelledby="evaluation-lane-title" className="training-lane">
          <header>
            <FlaskConical aria-hidden="true" size={18} />
            <h3 id="evaluation-lane-title">Evaluation lane</h3>
          </header>
          <ul className="surface-list">
            {evaluationRuns.map((run) => (
              <li key={run.id}>
                <div>
                  <strong>{run.suiteId}</strong>
                  <span>
                    {run.agentTemplateId} / v{run.baselineVersion} -&gt; v{run.candidateVersion}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{run.status}</dd>
                  </div>
                  <div>
                    <dt>Score</dt>
                    <dd>{run.score ?? "Pending"}</dd>
                  </div>
                  <div>
                    <dt>Regressions</dt>
                    <dd>{run.regressionCount}</dd>
                  </div>
                  <div>
                    <dt>Cost</dt>
                    <dd>${(run.estimatedCostCents / 100).toFixed(2)}</dd>
                  </div>
                </dl>
                {run.artifactPath ? <code>{run.artifactPath}</code> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form
        className="agent-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitAgentTemplate();
        }}
      >
        <label>
          <span>Name</span>
          <input
            disabled={saving}
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </label>
        <label>
          <span>Route</span>
          <input disabled readOnly value={`agenticcrew://agents/local/${editingTemplateId ?? generatedId}`} />
        </label>
        <label>
          <span>Role</span>
          <input
            disabled={saving}
            onChange={(event) => {
              setRole(event.target.value);
            }}
            value={role}
          />
        </label>
        <label>
          <span>Model</span>
          <select
            disabled={saving}
            onChange={(event) => {
              setModelId(event.target.value);
            }}
            value={modelId}
          >
            {modelSelectOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Harness</span>
          <select
            disabled={saving}
            onChange={(event) => {
              setHarnessProfileId(event.target.value);
            }}
            value={harnessProfileId}
          >
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
            onChange={(event) => {
              setBudgetDollars(event.target.value);
            }}
            step="0.01"
            type="number"
            value={budgetDollars}
          />
        </label>
        <label>
          <span>Description</span>
          <input
            disabled={saving}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </label>
        <label>
          <span>Skill routes</span>
          <textarea
            disabled={saving}
            onChange={(event) => {
              setSkillRoutesText(event.target.value);
            }}
            value={skillRoutesText}
          />
        </label>
        {availableSkillRoutes === undefined || availableSkillRoutes.length === 0 ? null : (
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
        )}
        <div className="settings-actions">
          <button
            disabled={saving || modelId.length === 0 || (editingTemplateId === null && generatedId.length === 0)}
            type="submit"
          >
            <Plus aria-hidden="true" size={16} />
            <span>{submitLabel}</span>
          </button>
          {editingTemplateId === null ? null : (
            <button disabled={saving} onClick={resetForm} type="button">
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

function agentVersionSummaries(snapshot: AgentStudioSnapshot) {
  return snapshot.templates.map((template) => {
    const trainingRuns = snapshot.trainingRuns.filter((run) => run.agentTemplateId === template.id);

    return {
      active: template.active,
      currentVersion: template.version,
      latestTrainingStatus: trainingRuns.at(-1)?.status ?? null,
      promotedTrainingCount: trainingRuns.filter(
        (run) => run.promotedVersion !== null && run.promotedVersion !== undefined
      ).length,
      templateId: template.id,
      templateName: template.name
    };
  });
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
