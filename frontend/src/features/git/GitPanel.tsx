import { useMemo, useState } from "react";
import { FolderOpen, GitBranch, GitCommit, GitPullRequest, RefreshCcw, Save, ShieldCheck } from "lucide-react";
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
          <FolderOpen aria-hidden="true" size={20} />
          <strong>Path</strong>
          <span>{workspace.path}</span>
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
  const [path, setPath] = useState(initialPath);

  return (
    <form
      className="git-context-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          branch,
          path
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
      <label>
        <span>Workspace path</span>
        <input
          onChange={(event) => {
            setPath(event.target.value);
          }}
          value={path}
        />
      </label>
      <button type="submit">
        <Save aria-hidden="true" size={16} />
        <span>Save Git context</span>
      </button>
    </form>
  );
}
