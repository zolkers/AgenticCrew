use serde::Serialize;

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
    MissionControlSnapshot {
        active_session_count: 0,
        active_agent_count: 0,
        current_cost_usd: 0.0,
        provider: "openai".to_owned(),
        model: "gpt-5-codex".to_owned(),
        current_checkpoint: "initial".to_owned(),
        human_gate_status: HumanGateStatus::Open,
    }
}

#[cfg(test)]
mod tests {
    use super::{initial_mission_control_snapshot, HumanGateStatus, MissionControlSnapshot};

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
}
