use serde::{Deserialize, Serialize};
use std::process::Command;

use super::state::AgentOsState;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    pub branch: String,
    pub mission: String,
    pub status: WorkspaceStatus,
    pub active_agent_id: String,
    #[serde(default)]
    pub selected_agent_template_id: Option<String>,
    #[serde(default)]
    pub selected_harness_profile_id: Option<String>,
    pub budget_limit_usd: u64,
    pub budget_used_usd: u64,
    #[serde(default)]
    pub agents: Vec<WorkspaceAgent>,
    #[serde(default)]
    pub checkpoints: Vec<WorkspaceCheckpoint>,
    #[serde(default)]
    pub logs: Vec<String>,
    #[serde(default)]
    pub skills: Vec<String>,
    #[serde(default)]
    pub git_history: Vec<WorkspaceGitHistoryEntry>,
    #[serde(default)]
    pub git_status: WorkspaceGitStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceStatus {
    Configured,
    Running,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAgent {
    pub id: String,
    pub name: String,
    pub role: String,
    pub status: WorkspaceAgentStatus,
    pub model: String,
    #[serde(default)]
    pub tools: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceAgentStatus {
    Active,
    Reviewing,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCheckpoint {
    pub label: String,
    pub state: WorkspaceCheckpointState,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceGitStatus {
    pub ahead_count: u32,
    pub behind_count: u32,
    pub branch: String,
    pub has_untracked: bool,
    pub is_dirty: bool,
    pub last_error: Option<String>,
    pub last_refreshed_at: Option<String>,
    pub remote_branch: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceGitHistoryEntry {
    pub author: String,
    pub branch: String,
    pub hash: String,
    pub message: String,
    pub relative_time: String,
}

impl Default for WorkspaceGitStatus {
    fn default() -> Self {
        Self {
            ahead_count: 0,
            behind_count: 0,
            branch: String::new(),
            has_untracked: false,
            is_dirty: false,
            last_error: None,
            last_refreshed_at: None,
            remote_branch: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceCheckpointState {
    Done,
    Queued,
    Running,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub workspaces: Vec<WorkspaceRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub id: String,
    pub name: String,
    pub path: String,
    pub branch: String,
    pub mission: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceGitContextRequest {
    pub workspace_id: String,
    pub path: String,
    pub branch: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceLoadoutRequest {
    pub workspace_id: String,
    pub agent_template_id: Option<String>,
    pub harness_profile_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshWorkspaceGitStatusRequest {
    pub workspace_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitPreviewRequest {
    pub workspace_id: String,
    pub commit_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitPreviewResponse {
    pub workspace_id: String,
    pub commit_hash: String,
    pub metadata: CommitPreviewMetadata,
    pub files: Vec<CommitPreviewFile>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitPreviewMetadata {
    pub hash: String,
    pub short_hash: String,
    pub author_name: String,
    pub author_email: String,
    pub authored_at: String,
    pub subject: String,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitPreviewFile {
    pub path: String,
    pub status: String,
    pub additions: u32,
    pub deletions: u32,
    pub diff_lines: Vec<CommitPreviewDiffLine>,
    pub category: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitPreviewDiffLine {
    pub kind: String,
    pub content: String,
}

pub fn workspace_snapshot_from_state(state: &AgentOsState) -> WorkspaceSnapshot {
    WorkspaceSnapshot {
        workspaces: state.workspaces.clone(),
    }
}

pub fn read_commit_preview(
    workspace: &WorkspaceRecord,
    request: &CommitPreviewRequest,
) -> Result<CommitPreviewResponse, String> {
    validate_commit_hash(&request.commit_hash)?;

    let output = Command::new("git")
        .args([
            "-C",
            workspace.path.as_str(),
            "show",
            "--numstat",
            "--patch",
            "--date=iso-strict",
            "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b%x1e",
            request.commit_hash.as_str(),
        ])
        .output()
        .map_err(|error| format!("git unavailable: {error}"))?;

    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if message.is_empty() {
            format!("git show failed for commit '{}'", request.commit_hash)
        } else {
            message
        });
    }

    parse_commit_preview_show_output(
        request.workspace_id.as_str(),
        request.commit_hash.as_str(),
        &String::from_utf8_lossy(&output.stdout),
    )
}

impl WorkspaceRecord {
    pub fn built_in_workspaces() -> Vec<Self> {
        vec![Self::fullstack_app(), Self::mobile_qa()]
    }

    pub fn local(request: CreateWorkspaceRequest) -> Result<Self, WorkspaceError> {
        let id = validate_identifier("workspace id", request.id)?;
        let name = validate_required("workspace name", request.name)?;
        let path = validate_required("workspace path", request.path)?;
        let branch = validate_required("workspace branch", request.branch)?;
        let mission = validate_required("workspace mission", request.mission)?;

        Ok(Self {
            active_agent_id: "director".to_owned(),
            selected_agent_template_id: None,
            selected_harness_profile_id: None,
            agents: vec![WorkspaceAgent {
                id: "director".to_owned(),
                model: "gpt-5".to_owned(),
                name: "director".to_owned(),
                role: "Workspace director".to_owned(),
                status: WorkspaceAgentStatus::Active,
                tools: vec![
                    "planning".to_owned(),
                    "git".to_owned(),
                    "workspace".to_owned(),
                ],
            }],
            branch: branch.clone(),
            budget_limit_usd: 10,
            budget_used_usd: 0,
            checkpoints: vec![
                WorkspaceCheckpoint {
                    label: "Workspace created".to_owned(),
                    state: WorkspaceCheckpointState::Done,
                },
                WorkspaceCheckpoint {
                    label: mission.clone(),
                    state: WorkspaceCheckpointState::Running,
                },
                WorkspaceCheckpoint {
                    label: "First run validation".to_owned(),
                    state: WorkspaceCheckpointState::Queued,
                },
            ],
            id: id.clone(),
            logs: vec![
                format!("$ agenticcrew attach {id} --workspace {path}"),
                format!("workspace resolved: {id} / branch {branch}"),
                format!("mission: {mission}"),
            ],
            mission,
            name,
            path,
            skills: vec![
                "superpowers:tdd".to_owned(),
                "git:workspace-context".to_owned(),
            ],
            git_history: Vec::new(),
            git_status: WorkspaceGitStatus {
                branch,
                ..WorkspaceGitStatus::default()
            },
            status: WorkspaceStatus::Configured,
        })
    }

    pub fn update_git_context(
        &mut self,
        request: UpdateWorkspaceGitContextRequest,
    ) -> Result<(), WorkspaceError> {
        self.path = validate_required("workspace path", request.path)?;
        self.branch = validate_required("workspace branch", request.branch)?;
        self.git_status.branch = self.branch.clone();
        self.git_status.last_error = None;
        self.logs
            .push(format!("git context updated: {}", self.branch));

        Ok(())
    }

    pub fn refresh_git_status(&mut self, refreshed_at: String) {
        self.git_status = read_git_status(&self.path, refreshed_at);
        if self.git_status.last_error.is_none() && !self.git_status.branch.is_empty() {
            self.branch = self.git_status.branch.clone();
            self.git_history = read_git_history(&self.path, &self.branch);
        }
        self.logs.push(format!(
            "git status refreshed: {}",
            self.git_status
                .last_error
                .as_deref()
                .unwrap_or(self.git_status.branch.as_str())
        ));
    }

    pub fn update_loadout(
        &mut self,
        request: UpdateWorkspaceLoadoutRequest,
    ) -> Result<(), WorkspaceError> {
        self.selected_agent_template_id =
            normalize_optional_identifier("agent template id", request.agent_template_id)?;
        self.selected_harness_profile_id =
            normalize_optional_identifier("harness profile id", request.harness_profile_id)?;
        self.logs.push(format!(
            "loadout updated: agent={} harness={}",
            self.selected_agent_template_id
                .as_deref()
                .unwrap_or("default"),
            self.selected_harness_profile_id
                .as_deref()
                .unwrap_or("default")
        ));

        Ok(())
    }

    fn fullstack_app() -> Self {
        Self {
            active_agent_id: "maya".to_owned(),
            selected_agent_template_id: Some("developer-pi".to_owned()),
            selected_harness_profile_id: Some("pi-execution-discipline".to_owned()),
            agents: vec![
                WorkspaceAgent {
                    id: "maya".to_owned(),
                    model: "gpt-5".to_owned(),
                    name: "Maya".to_owned(),
                    role: "UI architect".to_owned(),
                    status: WorkspaceAgentStatus::Active,
                    tools: vec![
                        "file_write".to_owned(),
                        "browser".to_owned(),
                        "git".to_owned(),
                    ],
                },
                WorkspaceAgent {
                    id: "reviewer".to_owned(),
                    model: "gpt-5.4".to_owned(),
                    name: "Reviewer".to_owned(),
                    role: "quality gate".to_owned(),
                    status: WorkspaceAgentStatus::Reviewing,
                    tools: vec!["code_review".to_owned(), "tests".to_owned()],
                },
            ],
            branch: "dev".to_owned(),
            budget_limit_usd: 2,
            budget_used_usd: 0,
            checkpoints: vec![
                WorkspaceCheckpoint {
                    label: "Architecture".to_owned(),
                    state: WorkspaceCheckpointState::Done,
                },
                WorkspaceCheckpoint {
                    label: "Models defined".to_owned(),
                    state: WorkspaceCheckpointState::Done,
                },
                WorkspaceCheckpoint {
                    label: "Endpoints coding".to_owned(),
                    state: WorkspaceCheckpointState::Running,
                },
                WorkspaceCheckpoint {
                    label: "Tests".to_owned(),
                    state: WorkspaceCheckpointState::Queued,
                },
            ],
            id: "fullstack-app".to_owned(),
            logs: vec![
                "[sys] Goal anchored - Build UI shell".to_owned(),
                "[maya] Reading architecture spec from docs".to_owned(),
                "[tool] file_write -> frontend/src/app/App.tsx".to_owned(),
                "[ok] Syntax valid".to_owned(),
            ],
            mission: "Build UI shell".to_owned(),
            name: "Fullstack App".to_owned(),
            path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew".to_owned(),
            skills: vec![
                "react".to_owned(),
                "electron".to_owned(),
                "superpowers:tdd".to_owned(),
            ],
            git_history: Vec::new(),
            git_status: WorkspaceGitStatus {
                branch: "dev".to_owned(),
                remote_branch: Some("origin/dev".to_owned()),
                ..WorkspaceGitStatus::default()
            },
            status: WorkspaceStatus::Running,
        }
    }

    fn mobile_qa() -> Self {
        Self {
            active_agent_id: "qa".to_owned(),
            selected_agent_template_id: Some("developer-pi".to_owned()),
            selected_harness_profile_id: Some("pi-execution-discipline".to_owned()),
            agents: vec![WorkspaceAgent {
                id: "qa".to_owned(),
                model: "gpt-5".to_owned(),
                name: "QA Agent".to_owned(),
                role: "device automation".to_owned(),
                status: WorkspaceAgentStatus::Active,
                tools: vec![
                    "browser".to_owned(),
                    "playwright".to_owned(),
                    "reports".to_owned(),
                ],
            }],
            branch: "qa/device-smoke".to_owned(),
            budget_limit_usd: 3,
            budget_used_usd: 1,
            checkpoints: vec![
                WorkspaceCheckpoint {
                    label: "Device matrix".to_owned(),
                    state: WorkspaceCheckpointState::Done,
                },
                WorkspaceCheckpoint {
                    label: "Smoke pass".to_owned(),
                    state: WorkspaceCheckpointState::Running,
                },
                WorkspaceCheckpoint {
                    label: "Report".to_owned(),
                    state: WorkspaceCheckpointState::Queued,
                },
            ],
            id: "mobile-qa".to_owned(),
            logs: vec![
                "[sys] Goal anchored - Stabilize device smoke".to_owned(),
                "[qa] Launching browser suite".to_owned(),
                "[tool] playwright-runner -> smoke/mobile".to_owned(),
            ],
            mission: "Stabilize device smoke".to_owned(),
            name: "Mobile QA".to_owned(),
            path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew".to_owned(),
            skills: vec!["playwright".to_owned(), "qa".to_owned()],
            git_history: Vec::new(),
            git_status: WorkspaceGitStatus {
                branch: "qa/device-smoke".to_owned(),
                remote_branch: Some("origin/qa/device-smoke".to_owned()),
                ..WorkspaceGitStatus::default()
            },
            status: WorkspaceStatus::Running,
        }
    }
}

fn read_git_status(path: &str, refreshed_at: String) -> WorkspaceGitStatus {
    match Command::new("git")
        .args(["-C", path, "status", "--short", "--branch"])
        .output()
    {
        Ok(output) if output.status.success() => {
            parse_git_status(&String::from_utf8_lossy(&output.stdout), refreshed_at)
        }
        Ok(output) => {
            let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
            WorkspaceGitStatus {
                last_error: Some(if message.is_empty() {
                    "git status failed".to_owned()
                } else {
                    message
                }),
                last_refreshed_at: Some(refreshed_at),
                ..WorkspaceGitStatus::default()
            }
        }
        Err(error) => WorkspaceGitStatus {
            last_error: Some(format!("git unavailable: {error}")),
            last_refreshed_at: Some(refreshed_at),
            ..WorkspaceGitStatus::default()
        },
    }
}

fn read_git_history(path: &str, branch: &str) -> Vec<WorkspaceGitHistoryEntry> {
    let output = Command::new("git")
        .args([
            "-C",
            path,
            "log",
            "--max-count=25",
            "--date=relative",
            "--format=%h%x1f%an%x1f%ar%x1f%s",
        ])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            parse_git_history(&String::from_utf8_lossy(&output.stdout), branch)
        }
        _ => Vec::new(),
    }
}

fn parse_git_history(output: &str, branch: &str) -> Vec<WorkspaceGitHistoryEntry> {
    output
        .lines()
        .filter_map(|line| parse_git_history_line(line, branch))
        .collect()
}

fn parse_git_history_line(line: &str, branch: &str) -> Option<WorkspaceGitHistoryEntry> {
    let mut fields = line.splitn(4, '\u{1f}');
    let hash = fields.next()?.trim();
    let author = fields.next()?.trim();
    let relative_time = fields.next()?.trim();
    let message = fields.next()?.trim();

    if hash.is_empty() || message.is_empty() {
        return None;
    }

    Some(WorkspaceGitHistoryEntry {
        author: author.to_owned(),
        branch: branch.to_owned(),
        hash: hash.to_owned(),
        message: message.to_owned(),
        relative_time: relative_time.to_owned(),
    })
}

fn parse_git_status(output: &str, refreshed_at: String) -> WorkspaceGitStatus {
    let mut lines = output.lines();
    let header = lines.next().unwrap_or_default();
    let mut status = WorkspaceGitStatus {
        last_refreshed_at: Some(refreshed_at),
        ..WorkspaceGitStatus::default()
    };

    if let Some(branch_summary) = header.strip_prefix("## ") {
        parse_branch_summary(branch_summary, &mut status);
    }

    for line in lines {
        let marker = line.get(0..2).unwrap_or_default();
        if marker == "??" {
            status.has_untracked = true;
        }
        if !line.trim().is_empty() {
            status.is_dirty = true;
        }
    }

    status
}

fn parse_branch_summary(summary: &str, status: &mut WorkspaceGitStatus) {
    let mut parts = summary.splitn(2, "...");
    status.branch = parts
        .next()
        .unwrap_or_default()
        .trim()
        .trim_end_matches(" [gone]")
        .to_owned();

    let Some(remote_summary) = parts.next() else {
        return;
    };
    let mut remote_parts = remote_summary.splitn(2, " [");
    let remote_branch = remote_parts.next().unwrap_or_default().trim();
    if !remote_branch.is_empty() {
        status.remote_branch = Some(remote_branch.to_owned());
    }

    let Some(divergence) = remote_parts.next() else {
        return;
    };
    for item in divergence.trim_end_matches(']').split(", ") {
        if let Some(value) = item.strip_prefix("ahead ") {
            status.ahead_count = value.parse().unwrap_or(0);
        }
        if let Some(value) = item.strip_prefix("behind ") {
            status.behind_count = value.parse().unwrap_or(0);
        }
    }
}

fn validate_commit_hash(commit_hash: &str) -> Result<(), String> {
    let commit_hash = commit_hash.trim();
    if commit_hash.is_empty() {
        return Err("commit hash is required".to_owned());
    }
    if !(4..=64).contains(&commit_hash.len())
        || !commit_hash
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err(format!(
            "commit hash '{commit_hash}' must be 4 to 64 hexadecimal characters"
        ));
    }

    Ok(())
}

fn parse_commit_preview_show_output(
    workspace_id: &str,
    commit_hash: &str,
    output: &str,
) -> Result<CommitPreviewResponse, String> {
    let Some((metadata_output, changes_output)) = output.split_once('\u{1e}') else {
        return Err("git show output did not include commit metadata".to_owned());
    };

    let mut fields = metadata_output.trim_start_matches('\n').splitn(7, '\u{1f}');
    let metadata = CommitPreviewMetadata {
        hash: fields.next().unwrap_or_default().trim().to_owned(),
        short_hash: fields.next().unwrap_or_default().trim().to_owned(),
        author_name: fields.next().unwrap_or_default().trim().to_owned(),
        author_email: fields.next().unwrap_or_default().trim().to_owned(),
        authored_at: fields.next().unwrap_or_default().trim().to_owned(),
        subject: fields.next().unwrap_or_default().trim().to_owned(),
        body: fields.next().unwrap_or_default().trim().to_owned(),
    };

    if metadata.hash.is_empty() {
        return Err("git show output did not include a commit hash".to_owned());
    }

    let mut files = Vec::new();
    let mut patch_lines = Vec::new();
    let mut reading_patch = false;
    for line in changes_output.lines() {
        if line.starts_with("diff --git ") {
            reading_patch = true;
        }
        if reading_patch {
            patch_lines.push(line);
            continue;
        }
        if line.trim().is_empty() {
            continue;
        }
        if let Some(file) = parse_numstat_line(line) {
            files.push(file);
        }
    }

    attach_patch_lines(&mut files, &patch_lines);

    Ok(CommitPreviewResponse {
        workspace_id: workspace_id.to_owned(),
        commit_hash: commit_hash.to_owned(),
        metadata,
        files,
    })
}

fn parse_numstat_line(line: &str) -> Option<CommitPreviewFile> {
    let mut parts = line.splitn(3, '\t');
    let additions = parse_numstat_count(parts.next()?);
    let deletions = parse_numstat_count(parts.next()?);
    let path = parts.next()?.trim();
    if path.is_empty() {
        return None;
    }
    let status = if path.contains(" => ") {
        "renamed"
    } else {
        "modified"
    };
    let path = normalize_numstat_path(path);

    Some(CommitPreviewFile {
        category: categorize_commit_file(&path),
        path,
        status: status.to_owned(),
        additions,
        deletions,
        diff_lines: Vec::new(),
    })
}

fn parse_numstat_count(value: &str) -> u32 {
    value.trim().parse().unwrap_or(0)
}

fn normalize_numstat_path(path: &str) -> String {
    if let Some(brace_start) = path.find('{') {
        if let Some(brace_end_offset) = path[brace_start + 1..].find('}') {
            let brace_end = brace_start + 1 + brace_end_offset;
            let prefix = &path[..brace_start];
            let inner = &path[brace_start + 1..brace_end];
            let suffix = &path[brace_end + 1..];

            if let Some((_, renamed_to)) = inner.rsplit_once(" => ") {
                return format!("{prefix}{}{suffix}", renamed_to.trim());
            }
        }
    }

    if let Some((_, renamed_to)) = path.rsplit_once(" => ") {
        return renamed_to.trim().to_owned();
    }

    path.to_owned()
}

fn attach_patch_lines(files: &mut Vec<CommitPreviewFile>, patch_lines: &[&str]) {
    let mut current_path: Option<String> = None;

    for line in patch_lines {
        if let Some(path) = parse_diff_git_path(line) {
            ensure_commit_file(files, &path);
            current_path = Some(path);
        }

        let Some(path) = current_path.as_deref() else {
            continue;
        };
        let file = ensure_commit_file(files, path);
        update_file_status_from_patch_line(file, line);
        if let Some(renamed_path) = line.strip_prefix("rename to ") {
            file.path = renamed_path.trim().to_owned();
            file.category = categorize_commit_file(&file.path);
            current_path = Some(file.path.clone());
        }
        file.diff_lines.push(CommitPreviewDiffLine {
            kind: diff_line_kind(line),
            content: (*line).to_owned(),
        });
    }
}

fn parse_diff_git_path(line: &str) -> Option<String> {
    let rest = line.strip_prefix("diff --git ")?;
    let (_, after_b) = rest.rsplit_once(" b/")?;
    Some(after_b.to_owned())
}

fn ensure_commit_file<'a>(
    files: &'a mut Vec<CommitPreviewFile>,
    path: &str,
) -> &'a mut CommitPreviewFile {
    if let Some(position) = files.iter().position(|file| file.path == path) {
        return &mut files[position];
    }

    files.push(CommitPreviewFile {
        path: path.to_owned(),
        status: "modified".to_owned(),
        additions: 0,
        deletions: 0,
        diff_lines: Vec::new(),
        category: categorize_commit_file(path),
    });

    files.last_mut().expect("file was just pushed")
}

fn update_file_status_from_patch_line(file: &mut CommitPreviewFile, line: &str) {
    if line.starts_with("new file mode ") {
        file.status = "added".to_owned();
    } else if line.starts_with("deleted file mode ") {
        file.status = "deleted".to_owned();
    } else if line.starts_with("rename from ") || line.starts_with("rename to ") {
        file.status = "renamed".to_owned();
    }
}

fn diff_line_kind(line: &str) -> String {
    if line.starts_with("@@") {
        "hunk"
    } else if line.starts_with('+') && !line.starts_with("+++") {
        "addition"
    } else if line.starts_with('-') && !line.starts_with("---") {
        "deletion"
    } else if line.starts_with("diff --git ")
        || line.starts_with("index ")
        || line.starts_with("--- ")
        || line.starts_with("+++ ")
        || line.starts_with("new file mode ")
        || line.starts_with("deleted file mode ")
        || line.starts_with("rename from ")
        || line.starts_with("rename to ")
    {
        "header"
    } else {
        "context"
    }
    .to_owned()
}

fn categorize_commit_file(path: &str) -> String {
    let normalized = path.replace('\\', "/").to_ascii_lowercase();
    if normalized.contains("/test/")
        || normalized.contains("/tests/")
        || normalized.contains("__tests__")
        || normalized.ends_with(".test.cjs")
        || normalized.ends_with(".test.js")
        || normalized.ends_with(".test.ts")
        || normalized.ends_with(".spec.ts")
        || normalized.ends_with("_test.rs")
    {
        "test"
    } else if normalized.starts_with("docs/")
        || normalized.ends_with(".md")
        || normalized.ends_with(".mdx")
    {
        "docs"
    } else if normalized.ends_with("cargo.lock") || normalized.ends_with("package-lock.json") {
        "generated"
    } else if normalized.ends_with("cargo.toml")
        || normalized.ends_with("package.json")
        || normalized.ends_with(".config.js")
        || normalized.ends_with(".cjs")
        || normalized.ends_with(".toml")
        || normalized.ends_with(".json")
        || normalized.ends_with(".yml")
        || normalized.ends_with(".yaml")
    {
        "config"
    } else {
        "source"
    }
    .to_owned()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WorkspaceError {
    EmptyField { field: &'static str },
    InvalidIdentifier { field: &'static str, value: String },
}

impl std::fmt::Display for WorkspaceError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WorkspaceError::EmptyField { field } => write!(formatter, "{field} is required"),
            WorkspaceError::InvalidIdentifier { field, value } => {
                write!(
                    formatter,
                    "{field} '{value}' must use lowercase letters, numbers, '-' or '_'"
                )
            }
        }
    }
}

impl std::error::Error for WorkspaceError {}

fn validate_required(field: &'static str, value: String) -> Result<String, WorkspaceError> {
    let value = value.trim();

    if value.is_empty() {
        return Err(WorkspaceError::EmptyField { field });
    }

    Ok(value.to_owned())
}

fn validate_identifier(field: &'static str, value: String) -> Result<String, WorkspaceError> {
    let value = validate_required(field, value)?;
    let is_valid = value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(WorkspaceError::InvalidIdentifier { field, value });
    }

    Ok(value)
}

fn normalize_optional_identifier(
    field: &'static str,
    value: Option<String>,
) -> Result<Option<String>, WorkspaceError> {
    value
        .map(|value| {
            let value = value.trim();
            if value.is_empty() {
                Ok(None)
            } else {
                validate_identifier(field, value.to_owned()).map(Some)
            }
        })
        .transpose()
        .map(Option::flatten)
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_numstat_path, parse_commit_preview_show_output, parse_git_history,
        parse_git_status, workspace_snapshot_from_state, CreateWorkspaceRequest,
        UpdateWorkspaceGitContextRequest, UpdateWorkspaceLoadoutRequest, WorkspaceRecord,
        WorkspaceStatus,
    };
    use crate::core::state::AgentOsState;

    #[test]
    fn built_in_workspaces_seed_launchpad() {
        let workspaces = WorkspaceRecord::built_in_workspaces();

        assert_eq!(workspaces.len(), 2);
        assert_eq!(workspaces[0].id, "fullstack-app");
        assert_eq!(workspaces[1].id, "mobile-qa");
    }

    #[test]
    fn workspace_snapshot_reads_state_workspaces() {
        let snapshot = workspace_snapshot_from_state(&AgentOsState::empty());

        assert_eq!(snapshot.workspaces.len(), 2);
        assert_eq!(snapshot.workspaces[0].status, WorkspaceStatus::Running);
    }

    #[test]
    fn local_workspace_trims_fields_and_builds_default_run_context() {
        let workspace = WorkspaceRecord::local(CreateWorkspaceRequest {
            branch: " feature/workspace ".to_owned(),
            id: "api_workspace".to_owned(),
            mission: " Build API ".to_owned(),
            name: " API Workspace ".to_owned(),
            path: " C:\\work\\api ".to_owned(),
        })
        .expect("workspace should be valid");

        assert_eq!(workspace.name, "API Workspace");
        assert_eq!(workspace.path, "C:\\work\\api");
        assert_eq!(workspace.branch, "feature/workspace");
        assert_eq!(workspace.git_status.branch, "feature/workspace");
        assert_eq!(workspace.active_agent_id, "director");
        assert_eq!(workspace.selected_agent_template_id, None);
        assert_eq!(workspace.selected_harness_profile_id, None);
        assert_eq!(workspace.checkpoints[1].label, "Build API");
        assert_eq!(workspace.status, WorkspaceStatus::Configured);
    }

    #[test]
    fn workspace_git_context_update_trims_branch_and_path() {
        let mut workspace = WorkspaceRecord::local(CreateWorkspaceRequest {
            branch: "main".to_owned(),
            id: "api".to_owned(),
            mission: "Build API".to_owned(),
            name: "API".to_owned(),
            path: "C:\\work\\api".to_owned(),
        })
        .expect("workspace should be valid");

        workspace
            .update_git_context(UpdateWorkspaceGitContextRequest {
                branch: " feature/api ".to_owned(),
                path: " D:\\api ".to_owned(),
                workspace_id: "api".to_owned(),
            })
            .expect("git context should update");

        assert_eq!(workspace.branch, "feature/api");
        assert_eq!(workspace.path, "D:\\api");
        assert_eq!(workspace.git_status.branch, "feature/api");
        assert!(workspace.logs.last().expect("log").contains("feature/api"));
    }

    #[test]
    fn workspace_loadout_update_trims_optional_bindings() {
        let mut workspace = WorkspaceRecord::local(CreateWorkspaceRequest {
            branch: "main".to_owned(),
            id: "api".to_owned(),
            mission: "Build API".to_owned(),
            name: "API".to_owned(),
            path: "C:\\work\\api".to_owned(),
        })
        .expect("workspace should be valid");

        workspace
            .update_loadout(UpdateWorkspaceLoadoutRequest {
                agent_template_id: Some(" developer-pi ".to_owned()),
                harness_profile_id: Some(" pi-execution-discipline ".to_owned()),
                workspace_id: "api".to_owned(),
            })
            .expect("loadout should update");

        assert_eq!(
            workspace.selected_agent_template_id,
            Some("developer-pi".to_owned())
        );
        assert_eq!(
            workspace.selected_harness_profile_id,
            Some("pi-execution-discipline".to_owned())
        );
        assert!(workspace.logs.last().expect("log").contains("developer-pi"));
    }

    #[test]
    fn parses_git_status_branch_dirty_and_divergence() {
        let status = parse_git_status(
            "## dev...origin/dev [ahead 2, behind 1]\n M src/main.rs\n?? docs/PLAN.md\n",
            "2026-05-29T12:00:00Z".to_owned(),
        );

        assert_eq!(status.branch, "dev");
        assert_eq!(status.remote_branch, Some("origin/dev".to_owned()));
        assert_eq!(status.ahead_count, 2);
        assert_eq!(status.behind_count, 1);
        assert!(status.is_dirty);
        assert!(status.has_untracked);
        assert_eq!(
            status.last_refreshed_at,
            Some("2026-05-29T12:00:00Z".to_owned())
        );
    }

    #[test]
    fn parses_git_history_lines_for_workspace_snapshot() {
        let history = parse_git_history(
            "abc1234\u{1f}Codex\u{1f}2 minutes ago\u{1f}feat(git): preview diffs\n",
            "dev",
        );

        assert_eq!(history.len(), 1);
        assert_eq!(history[0].hash, "abc1234");
        assert_eq!(history[0].author, "Codex");
        assert_eq!(history[0].relative_time, "2 minutes ago");
        assert_eq!(history[0].message, "feat(git): preview diffs");
        assert_eq!(history[0].branch, "dev");
    }

    #[test]
    fn normalizes_numstat_rename_paths_with_brace_syntax() {
        assert_eq!(
            normalize_numstat_path("src/{old.txt => new.txt}"),
            "src/new.txt"
        );
        assert_eq!(
            normalize_numstat_path("{old => new}/file.txt"),
            "new/file.txt"
        );
        assert_eq!(normalize_numstat_path("old.txt => new.txt"), "new.txt");
    }

    #[test]
    fn parses_commit_preview_metadata_numstat_and_diff_lines() {
        let output = concat!(
            "abc123def456\u{1f}abc123d\u{1f}Ada Lovelace\u{1f}ada@example.com\u{1f}",
            "2026-05-30T10:11:12+02:00\u{1f}Add parser\u{1f}Body line\n\u{1e}",
            "\n",
            "3\t1\tcrates/agenticcrew-core/src/core/workspaces.rs\n",
            "5\t0\telectron/ipc/contracts.test.cjs\n",
            "1\t1\tsrc/{old.ts => new.ts}\n",
            "\n",
            "diff --git a/crates/agenticcrew-core/src/core/workspaces.rs b/crates/agenticcrew-core/src/core/workspaces.rs\n",
            "index 1111111..2222222 100644\n",
            "--- a/crates/agenticcrew-core/src/core/workspaces.rs\n",
            "+++ b/crates/agenticcrew-core/src/core/workspaces.rs\n",
            "@@ -1,2 +1,3 @@\n",
            " use serde::{Deserialize, Serialize};\n",
            "+use std::process::Command;\n",
            "-use std::fmt;\n",
            "diff --git a/electron/ipc/contracts.test.cjs b/electron/ipc/contracts.test.cjs\n",
            "new file mode 100644\n",
            "index 0000000..3333333\n",
            "--- /dev/null\n",
            "+++ b/electron/ipc/contracts.test.cjs\n",
            "@@ -0,0 +1,2 @@\n",
            "+const test = require(\"node:test\");\n",
            "+test(\"allows preview\", () => {});\n",
            "diff --git a/src/old.ts b/src/new.ts\n",
            "similarity index 90%\n",
            "rename from src/old.ts\n",
            "rename to src/new.ts\n",
            "@@ -1 +1 @@\n",
            "-old\n",
            "+new\n"
        );

        let preview = parse_commit_preview_show_output("ws", "abc123d", output)
            .expect("git show output should parse");

        assert_eq!(preview.workspace_id, "ws");
        assert_eq!(preview.commit_hash, "abc123d");
        assert_eq!(preview.metadata.hash, "abc123def456");
        assert_eq!(preview.metadata.author_name, "Ada Lovelace");
        assert_eq!(preview.metadata.subject, "Add parser");
        assert_eq!(preview.files.len(), 3);
        assert_eq!(
            preview.files[0].path,
            "crates/agenticcrew-core/src/core/workspaces.rs"
        );
        assert_eq!(preview.files[0].status, "modified");
        assert_eq!(preview.files[0].additions, 3);
        assert_eq!(preview.files[0].deletions, 1);
        assert_eq!(preview.files[0].category, "source");
        assert!(preview.files[0]
            .diff_lines
            .iter()
            .any(|line| line.kind == "addition" && line.content == "+use std::process::Command;"));
        assert_eq!(preview.files[1].path, "electron/ipc/contracts.test.cjs");
        assert_eq!(preview.files[1].status, "added");
        assert_eq!(preview.files[1].category, "test");
        assert_eq!(preview.files[2].path, "src/new.ts");
        assert_eq!(preview.files[2].status, "renamed");
    }

    #[test]
    fn rejects_commit_preview_output_without_metadata_separator() {
        let error = parse_commit_preview_show_output("ws", "abc123d", "not metadata")
            .expect_err("malformed git show output should fail");

        assert_eq!(error, "git show output did not include commit metadata");
    }
}
