use serde::{Deserialize, Serialize};

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

pub fn workspace_snapshot_from_state(state: &AgentOsState) -> WorkspaceSnapshot {
    WorkspaceSnapshot {
        workspaces: state.workspaces.clone(),
    }
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
                tools: vec!["planning".to_owned(), "git".to_owned(), "workspace".to_owned()],
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
            status: WorkspaceStatus::Configured,
        })
    }

    pub fn update_git_context(
        &mut self,
        request: UpdateWorkspaceGitContextRequest,
    ) -> Result<(), WorkspaceError> {
        self.path = validate_required("workspace path", request.path)?;
        self.branch = validate_required("workspace branch", request.branch)?;
        self.logs.push(format!("git context updated: {}", self.branch));

        Ok(())
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
            self.selected_agent_template_id.as_deref().unwrap_or("default"),
            self.selected_harness_profile_id.as_deref().unwrap_or("default")
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
                    tools: vec!["file_write".to_owned(), "browser".to_owned(), "git".to_owned()],
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
                tools: vec!["browser".to_owned(), "playwright".to_owned(), "reports".to_owned()],
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
            status: WorkspaceStatus::Running,
        }
    }
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
        workspace_snapshot_from_state, CreateWorkspaceRequest, UpdateWorkspaceGitContextRequest,
        UpdateWorkspaceLoadoutRequest, WorkspaceRecord, WorkspaceStatus,
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
}
