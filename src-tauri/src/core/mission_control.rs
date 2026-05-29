use serde::Serialize;
use std::collections::BTreeSet;

use super::{
    sessions::{CheckpointStatus, FeatureSessionStatus},
    state::AgentOsState,
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
    pub active_session_count: u64,
    pub active_agent_count: u64,
    pub current_cost_usd: f64,
    pub provider: String,
    pub model: String,
    pub current_checkpoint: String,
    pub human_gate_status: HumanGateStatus,
}

pub fn initial_mission_control_snapshot() -> MissionControlSnapshot {
    mission_control_snapshot_from_state(&AgentOsState::empty())
}

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

    MissionControlSnapshot {
        active_session_count: active_sessions.len() as u64,
        active_agent_count: agent_ids.len() as u64,
        current_cost_usd: state
            .model_call_estimates
            .iter()
            .map(|estimate| estimate.estimated_cost_usd)
            .sum(),
        provider: current_estimate
            .map_or_else(|| "openai".to_owned(), |estimate| estimate.provider.clone()),
        model: current_estimate.map_or_else(
            || "gpt-5-codex".to_owned(),
            |estimate| estimate.model.clone(),
        ),
        current_checkpoint,
        human_gate_status,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        initial_mission_control_snapshot, mission_control_snapshot_from_state, HumanGateStatus,
        MissionControlSnapshot,
    };
    use crate::core::{
        costs::ModelCallEstimate,
        sessions::{
            Checkpoint, CheckpointStatus, FeatureSession, FeatureSessionStatus, GoalObject,
        },
        state::AgentOsState,
    };

    #[test]
    fn initial_snapshot_reports_static_mission_control_fields() {
        let snapshot = initial_mission_control_snapshot();

        assert_eq!(
            snapshot,
            MissionControlSnapshot {
                active_session_count: 0,
                active_agent_count: 0,
                current_cost_usd: 0.0,
                provider: "openai".to_owned(),
                model: "gpt-5-codex".to_owned(),
                current_checkpoint: "initial".to_owned(),
                human_gate_status: HumanGateStatus::Open,
            }
        );
    }

    #[test]
    fn snapshot_serializes_with_frontend_contract_names() {
        let serialized = serde_json::to_value(initial_mission_control_snapshot()).unwrap();

        assert_eq!(
            serialized,
            serde_json::json!({
                "activeSessionCount": 0,
                "activeAgentCount": 0,
                "currentCostUsd": 0.0,
                "provider": "openai",
                "model": "gpt-5-codex",
                "currentCheckpoint": "initial",
                "humanGateStatus": "open"
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
        assert_eq!(snapshot.provider, "anthropic");
        assert_eq!(snapshot.model, "claude-sonnet");
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
            agent_templates: Vec::new(),
            agent_training_runs: Vec::new(),
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
