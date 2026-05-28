use serde::{Deserialize, Serialize};

use super::{
    costs::ModelCallEstimate,
    evidence::Evidence,
    sessions::{DesignSession, FeatureSession, GoalObject},
};

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct AgentOsState {
    pub schema_version: u32,
    pub goals: Vec<GoalObject>,
    pub design_sessions: Vec<DesignSession>,
    pub feature_sessions: Vec<FeatureSession>,
    pub evidence: Vec<Evidence>,
    pub model_call_estimates: Vec<ModelCallEstimate>,
}

impl AgentOsState {
    pub fn empty() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            goals: Vec::new(),
            design_sessions: Vec::new(),
            feature_sessions: Vec::new(),
            evidence: Vec::new(),
            model_call_estimates: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{AgentOsState, CURRENT_SCHEMA_VERSION};

    #[test]
    fn empty_state_uses_current_schema_version() {
        let state = AgentOsState::empty();

        assert_eq!(state.schema_version, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn empty_state_starts_without_product_records() {
        let state = AgentOsState::empty();

        assert!(state.goals.is_empty());
        assert!(state.design_sessions.is_empty());
        assert!(state.feature_sessions.is_empty());
        assert!(state.evidence.is_empty());
        assert!(state.model_call_estimates.is_empty());
    }
}
