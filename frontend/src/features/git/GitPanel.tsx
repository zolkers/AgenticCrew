import { useMemo, useState } from "react";
import { GitBranch, GitCommit, GitPullRequest, History, RefreshCcw, Save, Send, ShieldCheck } from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";
import { uniqueStrings } from "../../shared/strings";

type GitPanelProps = Readonly<{
  branchOptions: readonly string[];
  onRefreshGitStatus: () => void;
  onWorkspaceChange: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  workspace: CockpitWorkspace;
}>;

export function GitPanel({ branchOptions, onRefreshGitStatus, onWorkspaceChange, workspace }: GitPanelProps) {
  const gitStatus = workspace.gitStatus;
  const aheadCount = gitStatus?.aheadCount ?? 0;
  const behindCount = gitStatus?.behindCount ?? 0;
  const isDirty = gitStatus?.isDirty ?? false;
  const hasDivergence = aheadCount + behindCount > 0;
  const selectableBranches = useMemo(
    () =>
      uniqueStrings([
        workspace.branch,
        gitStatus?.branch,
        gitStatus?.remoteBranch?.replace(/^origin\//u, ""),
        ...branchOptions
      ]),
    [branchOptions, gitStatus?.branch, gitStatus?.remoteBranch, workspace.branch]
  );
  const historyEntries = workspace.gitHistory ?? [];

  return (
    <section aria-label="Git Panel">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Repository</p>
          <h2>Git Panel</h2>
        </div>
        <button className="icon-action" onClick={onRefreshGitStatus} type="button">
          <RefreshCcw aria-hidden="true" size={16} />
          <span>Refresh</span>
        </button>
      </header>

      <div className="surface-grid">
        <article className="surface-card">
          <GitBranch aria-hidden="true" size={20} />
          <strong>Branch</strong>
          <span>{workspace.branch}</span>
        </article>
        <article className="surface-card">
          <GitCommit aria-hidden="true" size={20} />
          <strong>Status</strong>
          <span>{isDirty ? "Working tree dirty" : "Working tree clean"}</span>
        </article>
        <article className="surface-card">
          <GitPullRequest aria-hidden="true" size={20} />
          <strong>Remote</strong>
          <span>{gitStatus?.remoteBranch ?? "No upstream"}</span>
        </article>
        <article className="surface-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <strong>Sync</strong>
          <span>{hasDivergence ? `${String(aheadCount)} ahead / ${String(behindCount)} behind` : "In sync"}</span>
        </article>
      </div>

      <dl className="git-status-strip" aria-label="Git status details">
        <div>
          <dt>Untracked</dt>
          <dd>{gitStatus?.hasUntracked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Last refresh</dt>
          <dd>{gitStatus?.lastRefreshedAt ?? "Never"}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{gitStatus?.lastError ?? "Ready"}</dd>
        </div>
      </dl>

      <GitContextForm
        key={`${workspace.id}:${workspace.branch}:${workspace.path}`}
        branch={workspace.branch}
        branchOptions={selectableBranches}
        onSubmit={onWorkspaceChange}
        path={workspace.path}
      />

      <CommitComposer
        aheadCount={aheadCount}
        behindCount={behindCount}
        branch={workspace.branch}
        hasUntracked={gitStatus?.hasUntracked ?? false}
        isDirty={isDirty}
      />

      <section className="git-history-panel" aria-labelledby="git-history-title">
        <header>
          <History aria-hidden="true" size={18} />
          <div>
            <h3 id="git-history-title">History</h3>
            <span>{historyEntries.length === 0 ? "No local history loaded" : `${String(historyEntries.length)} commits`}</span>
          </div>
        </header>
        {historyEntries.length === 0 ? (
          <p className="empty-state">Commit history will appear here once this workspace reports Git log data.</p>
        ) : (
          <ol className="git-history-list">
            {historyEntries.map((entry) => (
              <li key={`${entry.hash}:${entry.message}`}>
                <span className="git-history-node" aria-hidden="true" />
                <div>
                  <strong>{entry.message}</strong>
                  <span>
                    {entry.hash} · {entry.author} · {entry.relativeTime}
                  </span>
                </div>
                <code>{entry.branch}</code>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

type CommitComposerProps = Readonly<{
  aheadCount: number;
  behindCount: number;
  branch: string;
  hasUntracked: boolean;
  isDirty: boolean;
}>;

function CommitComposer({ aheadCount, behindCount, branch, hasUntracked, isDirty }: CommitComposerProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const trimmedMessage = commitMessage.trim();
  const canCommit = trimmedMessage.length > 0 && (isDirty || hasUntracked);
  const changeSummary = isDirty || hasUntracked ? "Changes ready for review" : "No local changes detected";

  const submitCommit = (action: "commit" | "commit-push") => {
    if (!canCommit) {
      return;
    }

    setLastAction(action === "commit" ? "Commit prepared" : "Commit and push prepared");
  };

  return (
    <section className="git-commit-panel" aria-labelledby="git-commit-title">
      <header>
        <GitCommit aria-hidden="true" size={18} />
        <div>
          <h3 id="git-commit-title">Commit</h3>
          <span>{changeSummary}</span>
        </div>
      </header>
      <div className="git-commit-layout">
        <label>
          <span>Commit message</span>
          <textarea
            aria-label="Commit message"
            onChange={(event) => {
              setCommitMessage(event.target.value);
              setLastAction(null);
            }}
            placeholder="type(scope): describe the change"
            rows={5}
            value={commitMessage}
          />
        </label>
        <aside aria-label="Commit context">
          <dl>
            <div>
              <dt>Branch</dt>
              <dd>{branch}</dd>
            </div>
            <div>
              <dt>Working tree</dt>
              <dd>{isDirty ? "Modified" : "Clean"}</dd>
            </div>
            <div>
              <dt>Untracked</dt>
              <dd>{hasUntracked ? "Present" : "None"}</dd>
            </div>
            <div>
              <dt>Remote</dt>
              <dd>{`${String(aheadCount)} ahead / ${String(behindCount)} behind`}</dd>
            </div>
          </dl>
        </aside>
      </div>
      <div className="git-commit-actions">
        <button
          disabled={!canCommit}
          onClick={() => {
            submitCommit("commit");
          }}
          type="button"
        >
          <GitCommit aria-hidden="true" size={16} />
          <span>Commit</span>
        </button>
        <button
          disabled={!canCommit}
          onClick={() => {
            submitCommit("commit-push");
          }}
          type="button"
        >
          <Send aria-hidden="true" size={16} />
          <span>Commit & Push</span>
        </button>
        {lastAction ? <output>{lastAction}: {trimmedMessage}</output> : null}
      </div>
    </section>
  );
}

type GitContextFormProps = Readonly<{
  branch: string;
  branchOptions: readonly string[];
  onSubmit: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  path: string;
}>;

function GitContextForm({ branch: initialBranch, branchOptions, onSubmit, path: initialPath }: GitContextFormProps) {
  const [branch, setBranch] = useState(initialBranch);

  return (
    <form
      className="git-context-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          branch,
          path: initialPath
        });
      }}
    >
      <label>
        <span>Branch</span>
        <select
          onChange={(event) => {
            setBranch(event.target.value);
          }}
          value={branch}
        >
          {branchOptions.map((branchOption) => (
            <option key={branchOption} value={branchOption}>
              {branchOption}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">
        <Save aria-hidden="true" size={16} />
        <span>Save branch</span>
      </button>
    </form>
  );
}
