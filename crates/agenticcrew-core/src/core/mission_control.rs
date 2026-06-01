use serde::Serialize;
use std::collections::BTreeSet;

use super::{
    evidence::Evidence,
    sessions::{CheckpointStatus, FeatureSessionStatus},
    state::AgentOsState,
    workspaces::{WorkspaceRecord, WorkspaceStatus},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HumanGateStatus {
    Open,
    Pending,
    Blocked,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionControlSnapshot {
    pub active_workspace: Option<MissionActiveWorkspace>,
    pub active_provider: MissionActiveProvider,
    pub active_model: MissionActiveModel,
    pub active_session_count: u64,
    pub active_agent_count: u64,
    pub current_cost_usd: f64,
    pub current_checkpoint: String,
    pub human_gate_status: HumanGateStatus,
    pub sessions: Vec<MissionSessionSummary>,
    pub checkpoints: Vec<MissionCheckpointSummary>,
    pub cost_summary: MissionCostSummary,
    pub git_summary: MissionGitSummary,
    pub skill_summary: MissionSkillSummary,
    pub recent_evidence: Vec<MissionEvidenceSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionActiveWorkspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub branch: String,
    pub mission: String,
    pub status: WorkspaceStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionActiveProvider {
    pub provider_id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionActiveModel {
    pub provider_id: String,
    pub model_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionSessionSummary {
    pub id: String,
    pub title: String,
    pub branch: String,
    pub status: FeatureSessionStatus,
    pub checkpoint_count: u64,
    pub pending_checkpoint_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionCheckpointSummary {
    pub session_id: String,
    pub label: String,
    pub owner_agent: String,
    pub status: CheckpointStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionCostSummary {
    pub total_usd: f64,
    pub model_call_count: u64,
    pub total_tokens: u64,
    pub token_limit: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionGitSummary {
    pub workspace_count: u64,
    pub active_branches: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionSkillSummary {
    pub source_count: u64,
    pub active_source_count: u64,
    pub discovered_skill_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissionEvidenceSummary {
    pub evidence_id: String,
    pub checkpoint_id: String,
    pub command: String,
    pub exit_code: i32,
    pub created_at: String,
}

pub fn initial_mission_control_snapshot() -> MissionControlSnapshot {
    mission_control_snapshot_from_state(&AgentOsState::empty())
}

const DEFAULT_TOKEN_LIMIT: u64 = 1_000_000;

pub fn mission_control_snapshot_from_state(state: &AgentOsState) -> MissionControlSnapshot {
    let active_sessions: Vec<_> = state
        .feature_sessions
        .iter()
        .filter(|session| {
            !matches!(
                session.status,
                FeatureSessionStatus::Closed | FeatureSessionStatus::Archived
            )
        })
        .collect();
    let agent_ids: BTreeSet<_> = active_sessions
        .iter()
        .flat_map(|session| {
            session
                .checkpoints
                .iter()
                .map(|checkpoint| checkpoint.owner_agent.as_str())
        })
        .collect();
    let current_estimate = state.model_call_estimates.last();
    let active_provider = MissionActiveProvider {
        provider_id: current_estimate.map_or_else(
            || state.desktop_settings.ai_provider.provider_id.clone(),
            |estimate| estimate.provider.clone(),
        ),
        display_name: current_estimate.map_or_else(
            || state.desktop_settings.ai_provider.display_name.clone(),
            |estimate| estimate.provider.clone(),
        ),
    };
    let active_model = MissionActiveModel {
        provider_id: current_estimate.map_or_else(
            || state.desktop_settings.ai_provider.provider_id.clone(),
            |estimate| estimate.provider.clone(),
        ),
        model_id: current_estimate.map_or_else(
            || state.desktop_settings.ai_provider.selected_model_id.clone(),
            |estimate| estimate.model.clone(),
        ),
    };
    let current_checkpoint = active_sessions
        .iter()
        .flat_map(|session| session.checkpoints.iter())
        .find(|checkpoint| checkpoint.status != CheckpointStatus::Passed)
        .map_or_else(
            || "initial".to_owned(),
            |checkpoint| checkpoint.label.clone(),
        );
    let human_gate_status = if active_sessions
        .iter()
        .flat_map(|session| session.checkpoints.iter())
        .any(|checkpoint| {
            matches!(
                checkpoint.status,
                CheckpointStatus::Blocked | CheckpointStatus::Failed
            )
        }) {
        HumanGateStatus::Blocked
    } else if active_sessions
        .iter()
        .flat_map(|session| session.checkpoints.iter())
        .any(|checkpoint| checkpoint.status != CheckpointStatus::Passed)
    {
        HumanGateStatus::Pending
    } else {
        HumanGateStatus::Open
    };
    let current_cost_usd = if state.model_call_estimates.is_empty() {
        0.0
    } else {
        state
            .model_call_estimates
            .iter()
            .map(|estimate| estimate.estimated_cost_usd)
            .sum()
    };

    MissionControlSnapshot {
        active_workspace: active_workspace_from_state(state),
        active_provider,
        active_model,
        active_session_count: active_sessions.len() as u64,
        active_agent_count: agent_ids.len() as u64,
        current_cost_usd,
        current_checkpoint,
        human_gate_status,
        sessions: active_sessions
            .iter()
            .map(|session| MissionSessionSummary {
                id: session.id.clone(),
                title: session.title.clone(),
                branch: session.branch.clone(),
                status: session.status,
                checkpoint_count: session.checkpoints.len() as u64,
                pending_checkpoint_count: session
                    .checkpoints
                    .iter()
                    .filter(|checkpoint| checkpoint.status != CheckpointStatus::Passed)
                    .count() as u64,
            })
            .collect(),
        checkpoints: active_sessions
            .iter()
            .flat_map(|session| {
                session
                    .checkpoints
                    .iter()
                    .map(|checkpoint| MissionCheckpointSummary {
                        session_id: session.id.clone(),
                        label: checkpoint.label.clone(),
                        owner_agent: checkpoint.owner_agent.clone(),
                        status: checkpoint.status,
                    })
            })
            .collect(),
        cost_summary: MissionCostSummary {
            total_usd: current_cost_usd,
            model_call_count: state.model_call_estimates.len() as u64,
            total_tokens: state
                .model_call_estimates
                .iter()
                .map(|estimate| estimate.input_tokens + estimate.output_tokens)
                .sum(),
            token_limit: DEFAULT_TOKEN_LIMIT,
        },
        git_summary: MissionGitSummary {
            workspace_count: state.workspaces.len() as u64,
            active_branches: state
                .workspaces
                .iter()
                .map(|workspace| workspace.branch.clone())
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect(),
        },
        skill_summary: MissionSkillSummary {
            source_count: state.skill_sources.len() as u64,
            active_source_count: state
                .skill_sources
                .iter()
                .filter(|source| source.active)
                .count() as u64,
            discovered_skill_count: state
                .skill_sources
                .iter()
                .map(|source| source.discovered_skills.len() as u64)
                .sum(),
        },
        recent_evidence: state
            .evidence
            .iter()
            .rev()
            .take(5)
            .rev()
            .map(evidence_summary)
            .collect(),
    }
}

fn active_workspace_from_state(state: &AgentOsState) -> Option<MissionActiveWorkspace> {
    state
        .workspaces
        .iter()
        .find(|workspace| workspace.status == WorkspaceStatus::Running)
        .or_else(|| state.workspaces.first())
        .map(active_workspace_summary)
}

fn active_workspace_summary(workspace: &WorkspaceRecord) -> MissionActiveWorkspace {
    MissionActiveWorkspace {
        id: workspace.id.clone(),
        name: workspace.name.clone(),
        path: workspace.path.clone(),
        branch: workspace.branch.clone(),
        mission: workspace.mission.clone(),
        status: workspace.status,
    }
}

fn evidence_summary(evidence: &Evidence) -> MissionEvidenceSummary {
    MissionEvidenceSummary {
        evidence_id: evidence.evidence_id.clone(),
        checkpoint_id: evidence.checkpoint_id.clone(),
        command: evidence.command.clone(),
        exit_code: evidence.exit_code,
        created_at: evidence.created_at.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        initial_mission_control_snapshot, mission_control_snapshot_from_state, HumanGateStatus,
        MissionActiveModel, MissionActiveProvider, MissionActiveWorkspace, MissionControlSnapshot,
    };
    use crate::core::{
        costs::ModelCallEstimate,
        sessions::{
            Checkpoint, CheckpointStatus, FeatureSession, FeatureSessionStatus, GoalObject,
        },
        state::AgentOsState,
        workspaces::WorkspaceStatus,
    };

    #[test]
    fn initial_snapshot_reports_static_mission_control_fields() {
        let snapshot = initial_mission_control_snapshot();

        assert_eq!(
            snapshot,
            MissionControlSnapshot {
                active_workspace: Some(MissionActiveWorkspace {
                    branch: "dev".to_owned(),
                    id: "fullstack-app".to_owned(),
                    mission: "Build UI shell".to_owned(),
                    name: "Fullstack App".to_owned(),
                    path: "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew".to_owned(),
                    status: WorkspaceStatus::Running,
                }),
                active_provider: MissionActiveProvider {
                    display_name: "OpenAI".to_owned(),
                    provider_id: "openai".to_owned(),
                },
                active_model: MissionActiveModel {
                    model_id: "gpt-5".to_owned(),
                    provider_id: "openai".to_owned(),
                },
                active_session_count: 0,
                active_agent_count: 0,
                current_cost_usd: 0.0,
                current_checkpoint: "initial".to_owned(),
                human_gate_status: HumanGateStatus::Open,
                sessions: Vec::new(),
                checkpoints: Vec::new(),
                cost_summary: super::MissionCostSummary {
                    total_usd: 0.0,
                    model_call_count: 0,
                    total_tokens: 0,
                    token_limit: super::DEFAULT_TOKEN_LIMIT,
                },
                git_summary: super::MissionGitSummary {
                    workspace_count: 2,
                    active_branches: vec!["dev".to_owned(), "qa/device-smoke".to_owned()],
                },
                skill_summary: super::MissionSkillSummary {
                    source_count: 0,
                    active_source_count: 0,
                    discovered_skill_count: 0,
                },
                recent_evidence: Vec::new(),
            }
        );
    }

    #[test]
    fn snapshot_serializes_with_frontend_contract_names() {
        let serialized = serde_json::to_value(initial_mission_control_snapshot()).unwrap();

        assert_eq!(
            serialized,
            serde_json::json!({
                "activeWorkspace": {
                    "branch": "dev",
                    "id": "fullstack-app",
                    "mission": "Build UI shell",
                    "name": "Fullstack App",
                    "path": "C:\\Users\\vriegert\\IdeaProjects\\AgenticCrew",
                    "status": "running"
                },
                "activeProvider": {
                    "displayName": "OpenAI",
                    "providerId": "openai"
                },
                "activeModel": {
                    "modelId": "gpt-5",
                    "providerId": "openai"
                },
                "activeSessionCount": 0,
                "activeAgentCount": 0,
                "currentCostUsd": 0.0,
                "currentCheckpoint": "initial",
                "humanGateStatus": "open",
                "sessions": [],
                "checkpoints": [],
                "costSummary": {
                    "totalUsd": 0.0,
                    "modelCallCount": 0,
                    "totalTokens": 0,
                    "tokenLimit": super::DEFAULT_TOKEN_LIMIT
                },
                "gitSummary": {
                    "workspaceCount": 2,
                    "activeBranches": ["dev", "qa/device-smoke"]
                },
                "skillSummary": {
                    "sourceCount": 0,
                    "activeSourceCount": 0,
                    "discoveredSkillCount": 0
                },
                "recentEvidence": []
            })
        );
    }

    #[test]
    fn snapshot_counts_active_sessions_and_checkpoint_agents_from_state() {
        let mut state =
            state_with_session(FeatureSessionStatus::Running, CheckpointStatus::Pending);

        let snapshot = mission_control_snapshot_from_state(&state);

        assert_eq!(snapshot.active_session_count, 1);
        assert_eq!(snapshot.active_agent_count, 1);
        assert_eq!(snapshot.current_checkpoint, "State tests");
        assert_eq!(snapshot.human_gate_status, HumanGateStatus::Pending);
        assert_eq!(snapshot.sessions[0].pending_checkpoint_count, 1);
        assert_eq!(snapshot.checkpoints[0].owner_agent, "qa");

        state.feature_sessions[0].status = FeatureSessionStatus::Closed;
        let closed_snapshot = mission_control_snapshot_from_state(&state);

        assert_eq!(closed_snapshot.active_session_count, 0);
        assert_eq!(closed_snapshot.active_agent_count, 0);
    }

    #[test]
    fn snapshot_sums_costs_and_reports_latest_provider_model() {
        let mut state = AgentOsState::empty();
        state.model_call_estimates = vec![
            estimate("openai", "gpt-5-mini", 0.25),
            estimate("anthropic", "claude-sonnet", 0.75),
        ];

        let snapshot = mission_control_snapshot_from_state(&state);

        assert_eq!(snapshot.current_cost_usd, 1.0);
        assert_eq!(snapshot.active_provider.provider_id, "anthropic");
        assert_eq!(snapshot.active_provider.display_name, "anthropic");
        assert_eq!(snapshot.active_model.provider_id, "anthropic");
        assert_eq!(snapshot.active_model.model_id, "claude-sonnet");
        assert_eq!(snapshot.cost_summary.total_usd, 1.0);
        assert_eq!(snapshot.cost_summary.model_call_count, 2);
        assert_eq!(snapshot.cost_summary.total_tokens, 4);
        assert_eq!(
            snapshot.cost_summary.token_limit,
            super::DEFAULT_TOKEN_LIMIT
        );
    }

    #[test]
    fn snapshot_uses_durable_provider_settings_when_no_model_call_exists() {
        let mut state = AgentOsState::empty();
        state.desktop_settings.ai_provider.provider_id = "openai".to_owned();
        state.desktop_settings.ai_provider.display_name = "OpenAI".to_owned();
        state.desktop_settings.ai_provider.selected_model_id = "gpt-live-settings".to_owned();

        let snapshot = mission_control_snapshot_from_state(&state);

        assert_eq!(snapshot.active_provider.provider_id, "openai");
        assert_eq!(snapshot.active_provider.display_name, "OpenAI");
        assert_eq!(snapshot.active_model.provider_id, "openai");
        assert_eq!(snapshot.active_model.model_id, "gpt-live-settings");
    }

    #[test]
    fn snapshot_reports_blocked_gate_when_any_active_checkpoint_is_blocked_or_failed() {
        for status in [CheckpointStatus::Blocked, CheckpointStatus::Failed] {
            let state = state_with_session(FeatureSessionStatus::Running, status);

            let snapshot = mission_control_snapshot_from_state(&state);

            assert_eq!(snapshot.human_gate_status, HumanGateStatus::Blocked);
        }
    }

    fn state_with_session(
        session_status: FeatureSessionStatus,
        checkpoint_status: CheckpointStatus,
    ) -> AgentOsState {
        let mut checkpoint = Checkpoint::new(
            "state_tests",
            "State tests",
            "qa",
            vec!["command_exit_code"],
        );
        checkpoint.status = checkpoint_status;
        let mut session = FeatureSession::new(
            "feat_state_v1",
            "Build durable state",
            "goal_agentos",
            "core",
            "feat/state-v1",
            vec![checkpoint],
        );
        session.status = session_status;

        AgentOsState {
            schema_version: crate::core::state::CURRENT_SCHEMA_VERSION,
            goals: vec![GoalObject {
                id: "goal_agentos".to_owned(),
                title: "Persist state".to_owned(),
                definition_of_done: Vec::new(),
                constraints: Vec::new(),
                out_of_scope: Vec::new(),
            }],
            design_sessions: Vec::new(),
            feature_sessions: vec![session],
            evidence: Vec::new(),
            model_call_estimates: Vec::new(),
            skill_sources: Vec::new(),
            harness_profiles: Vec::new(),
            harness_bindings: Vec::new(),
            pi_extensions: Vec::new(),
            agent_templates: Vec::new(),
            agent_training_runs: Vec::new(),
            agent_evaluation_runs: Vec::new(),
            desktop_settings: Default::default(),
            workspaces: Vec::new(),
            runs: Vec::new(),
            run_commands: Vec::new(),
            run_events: Vec::new(),
        }
    }

    fn estimate(provider: &str, model: &str, estimated_cost_usd: f64) -> ModelCallEstimate {
        ModelCallEstimate {
            provider: provider.to_owned(),
            model: model.to_owned(),
            agent_id: "developer".to_owned(),
            input_tokens: 1,
            cached_tokens: 0,
            output_tokens: 1,
            estimated_cost_usd,
        }
    }
}
