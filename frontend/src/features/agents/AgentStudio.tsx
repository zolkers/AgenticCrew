import { useMemo, useState } from "react";
import { Bot, FlaskConical, Plus, Power, Route, Trophy } from "lucide-react";
import {
  createAgentTemplate,
  setAgentTemplateActive,
  type InvokeAgentStudio
} from "../../shared/api/agentStudioApi";
import type { AgentStudioSnapshot, HarnessStudioSnapshot } from "../../shared/types/core";

type AgentStudioProps = Readonly<{
  harnessSnapshot: HarnessStudioSnapshot;
  invoke: InvokeAgentStudio;
  onSnapshotChange?: (snapshot: AgentStudioSnapshot) => void;
  snapshot: AgentStudioSnapshot;
}>;

export function AgentStudio({ harnessSnapshot, invoke, onSnapshotChange, snapshot }: AgentStudioProps) {
  const [budgetDollars, setBudgetDollars] = useState("2.00");
  const [description, setDescription] = useState("Custom workspace agent.");
  const [error, setError] = useState<null | string>(null);
  const [harnessProfileId, setHarnessProfileId] = useState(harnessSnapshot.profiles[0]?.id ?? "");
  const [modelId, setModelId] = useState("gpt-5.2");
  const [name, setName] = useState("Review Agent");
  const [role, setRole] = useState("reviewer");
  const [saving, setSaving] = useState(false);
  const [skillRoutesText, setSkillRoutesText] = useState("agenticcrew://skills/superpowers/subagent-driven-development");
  const generatedId = useMemo(() => slugify(name), [name]);

  async function submitAgentTemplate() {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await createAgentTemplate(invoke, {
        active: true,
        budgetCents: Math.round(Number.parseFloat(budgetDollars || "0") * 100),
        description,
        harnessProfileId: harnessProfileId.length > 0 ? harnessProfileId : null,
        id: generatedId,
        modelId,
        name,
        providerId: "openai",
        role,
        skillRoutes: splitSkillRoutes(skillRoutesText)
      });
      onSnapshotChange?.(nextSnapshot);
      setName("Review Agent");
      setRole("reviewer");
      setDescription("Custom workspace agent.");
      setBudgetDollars("2.00");
      setSkillRoutesText("agenticcrew://skills/superpowers/subagent-driven-development");
    } catch {
      setError("Agent creation failed");
    } finally {
      setSaving(false);
    }
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
            <span>Version scoring pending</span>
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
            </li>
          ))}
        </ul>
        </>
      )}
      {snapshot.trainingRuns.length > 0 ? (
        <p>{snapshot.trainingRuns.length} training run queued</p>
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
          <input disabled readOnly value={`agenticcrew://agents/local/${generatedId}`} />
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
            <option value="gpt-5.2">GPT-5.2</option>
            <option value="gpt-5.1">GPT-5.1</option>
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-5-mini">GPT-5 mini</option>
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
        <div className="settings-actions">
          <button disabled={saving || generatedId.length === 0} type="submit">
            <Plus aria-hidden="true" size={16} />
            <span>{saving ? "Creating" : "Create agent"}</span>
          </button>
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
