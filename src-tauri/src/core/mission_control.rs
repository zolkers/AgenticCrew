use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HumanGateStatus {
    Open,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct MissionControlSnapshot {
    pub active_session_count: u64,
    pub active_agent_count: u64,
    pub current_cost: String,
    pub provider: String,
    pub model: String,
    pub current_checkpoint: String,
    pub human_gate_status: HumanGateStatus,
}

pub fn initial_mission_control_snapshot() -> MissionControlSnapshot {
    MissionControlSnapshot {
        active_session_count: 0,
        active_agent_count: 0,
        current_cost: "$0.00".to_owned(),
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
                current_cost: "$0.00".to_owned(),
                provider: "openai".to_owned(),
                model: "gpt-5-codex".to_owned(),
                current_checkpoint: "initial".to_owned(),
                human_gate_status: HumanGateStatus::Open,
            }
        );
    }
}
