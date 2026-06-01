import { useMemo, useState } from "react";
import {
  Copy,
  FileCode,
  GitBranch,
  GitCommit,
  GitPullRequest,
  History,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck
} from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";
import type { WorkspaceGitHistoryEntry } from "../../shared/types/core";
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
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const selectedCommit = historyEntries.find((entry) => entry.hash === selectedCommitHash) ?? historyEntries.at(0) ?? null;

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
          <div className="git-history-workbench">
            <ol className="git-history-list">
              {historyEntries.map((entry) => (
                <li key={`${entry.hash}:${entry.message}`}>
                  <span className="git-history-node" aria-hidden="true" />
                  <button
                    aria-label={`Preview ${entry.message}`}
                    aria-pressed={entry.hash === selectedCommit?.hash}
                    onClick={() => {
                      setSelectedCommitHash(entry.hash);
                    }}
                    type="button"
                  >
                    <span>
                      <strong>{entry.message}</strong>
                      <small>
                        {entry.hash} · {entry.author} · {entry.relativeTime}
                      </small>
                    </span>
                  </button>
                  <code>{entry.branch}</code>
                </li>
              ))}
            </ol>
            <CommitPreview commit={selectedCommit} />
          </div>
        )}
      </section>
    </section>
  );
}

type CommitFileCategory = "code" | "config" | "docs" | "tests";
type CommitFileStatus = "added" | "deleted" | "modified";

type CommitFilePreview = Readonly<{
  additions: number;
  category: CommitFileCategory;
  deletions: number;
  diffLines: readonly string[];
  path: string;
  status: CommitFileStatus;
}>;

type CommitFileFilter = "all" | CommitFileCategory;

const commitFileFilters: readonly { label: string; value: CommitFileFilter }[] = [
  { label: "All", value: "all" },
  { label: "Code", value: "code" },
  { label: "Docs", value: "docs" },
  { label: "Tests", value: "tests" },
  { label: "Config", value: "config" }
];

function CommitPreview({ commit }: Readonly<{ commit: WorkspaceGitHistoryEntry | null }>) {
  const [activeFilter, setActiveFilter] = useState<CommitFileFilter>("all");
  const [fileQuery, setFileQuery] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  if (commit === null) {
    return <p className="empty-state">Select a commit to inspect files, stats, and a diff preview.</p>;
  }

  const files = buildCommitFilePreviews(commit);
  const normalizedQuery = fileQuery.trim().toLowerCase();
  const filteredFiles = files.filter(
    (file) =>
      (activeFilter === "all" || file.category === activeFilter) &&
      (normalizedQuery.length === 0 || file.path.toLowerCase().includes(normalizedQuery))
  );
  const selectedFile =
    filteredFiles.find((file) => file.path === selectedFilePath) ??
    filteredFiles.at(0) ??
    null;
  const totalAdditions = files.reduce((total, file) => total + file.additions, 0);
  const totalDeletions = files.reduce((total, file) => total + file.deletions, 0);

  return (
    <article className="git-commit-preview" aria-labelledby="commit-preview-title">
      <header>
        <div>
          <p className="eyebrow">Selected commit</p>
          <h3 id="commit-preview-title">Commit preview</h3>
          <strong>{commit.message}</strong>
          <span>{commit.hash} · {commit.author} · {commit.relativeTime}</span>
        </div>
        <div className="git-preview-actions">
          <button type="button">
            <Copy aria-hidden="true" size={15} />
            <span>Copy hash</span>
          </button>
          <button type="button">
            <FileCode aria-hidden="true" size={15} />
            <span>Open diff</span>
          </button>
          <button type="button">
            <GitBranch aria-hidden="true" size={15} />
            <span>Create branch from here</span>
          </button>
        </div>
      </header>

      <dl className="git-preview-stats" aria-label="Commit file statistics">
        <div>
          <dt>Files</dt>
          <dd>{files.length}</dd>
        </div>
        <div>
          <dt>Additions</dt>
          <dd>+{totalAdditions}</dd>
        </div>
        <div>
          <dt>Deletions</dt>
          <dd>-{totalDeletions}</dd>
        </div>
        <div>
          <dt>Branch</dt>
          <dd>{commit.branch}</dd>
        </div>
      </dl>

      <div className="git-preview-toolbar">
        <div className="git-preview-filter-group" aria-label="Changed file filters">
          {commitFileFilters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.value}
              key={filter.value}
              onClick={() => {
                setActiveFilter(filter.value);
                setSelectedFilePath(null);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label>
          <Search aria-hidden="true" size={15} />
          <span>Search changed files</span>
          <input
            aria-label="Search changed files"
            onChange={(event) => {
              setFileQuery(event.target.value);
              setSelectedFilePath(null);
            }}
            value={fileQuery}
          />
        </label>
      </div>

      <div className="git-preview-layout">
        <div className="git-preview-files" aria-label="Files changed">
          {filteredFiles.length === 0 ? (
            <p>No files match the current filters</p>
          ) : (
            filteredFiles.map((file) => (
              <button
                aria-label={file.path}
                aria-pressed={file.path === selectedFile?.path}
                key={file.path}
                onClick={() => {
                  setSelectedFilePath(file.path);
                }}
                type="button"
              >
                <span>
                  <strong>{file.path}</strong>
                  <small>{file.status} · {file.category}</small>
                </span>
                <code>+{file.additions} -{file.deletions}</code>
              </button>
            ))
          )}
        </div>
        <section aria-label="Selected file diff" className="git-preview-diff">
          {selectedFile === null ? (
            <p>No file selected</p>
          ) : (
            <>
              <header>
                <strong>{selectedFile.path}</strong>
                <span>{selectedFile.status} · +{selectedFile.additions} -{selectedFile.deletions}</span>
              </header>
              <pre>
                {selectedFile.diffLines.map((line) => (
                  <code className={diffLineClassName(line)} key={line}>
                    {line}
                  </code>
                ))}
              </pre>
            </>
          )}
        </section>
      </div>
    </article>
  );
}

function buildCommitFilePreviews(commit: WorkspaceGitHistoryEntry): CommitFilePreview[] {
  const scope = commitScope(commit.message) ?? "app";
  const codePath = scope === "settings" ? "src/features/settings/SettingsPanel.tsx" : "src/app/App.tsx";

  return [
    {
      additions: 42,
      category: "code",
      deletions: 9,
      diffLines: [`@@ ${commit.hash} ${codePath}`, "+ render selected commit details", "- static history row", "+ wire preview selection"],
      path: codePath,
      status: "modified"
    },
    {
      additions: 18,
      category: "tests",
      deletions: 2,
      diffLines: ["@@ tests", "+ opens commit preview", "+ filters changed files", "- leaves history inert"],
      path: "frontend/src/app/App.test.tsx",
      status: "modified"
    },
    {
      additions: 7,
      category: "docs",
      deletions: 1,
      diffLines: ["@@ docs", "+ document Git preview flow", "- placeholder note"],
      path: "docs/roadmap.md",
      status: "modified"
    },
    {
      additions: 4,
      category: "config",
      deletions: 0,
      diffLines: ["@@ config", "+ keep lint and coverage gates visible"],
      path: "package.json",
      status: "modified"
    }
  ];
}

function commitScope(message: string): string | null {
  const openIndex = message.indexOf("(");
  const closeIndex = message.indexOf(")", openIndex + 1);

  if (openIndex < 0 || closeIndex <= openIndex + 1) {
    return null;
  }

  return message.slice(openIndex + 1, closeIndex);
}

function diffLineClassName(line: string) {
  if (line.startsWith("+")) {
    return "diff-line-added";
  }

  if (line.startsWith("-")) {
    return "diff-line-deleted";
  }

  return "diff-line-context";
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
