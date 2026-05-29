use serde::{Deserialize, Serialize};

use super::state::AgentOsState;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTemplate {
    pub id: String,
    pub name: String,
    pub role: String,
    pub description: String,
    pub provider_id: String,
    pub model_id: String,
    pub harness_profile_id: Option<String>,
    #[serde(default)]
    pub skill_routes: Vec<String>,
    pub budget_cents: u64,
    pub version: u32,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTrainingRun {
    pub id: String,
    pub agent_template_id: String,
    pub dataset_id: String,
    pub status: AgentTrainingStatus,
    pub critic_score: Option<u32>,
    pub promoted_version: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentTrainingStatus {
    Draft,
    Running,
    Completed,
    Failed,
    Promoted,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentStudioSnapshot {
    pub templates: Vec<AgentTemplate>,
    pub training_runs: Vec<AgentTrainingRun>,
    pub active_template_count: u64,
}

pub fn agent_studio_snapshot_from_state(state: &AgentOsState) -> AgentStudioSnapshot {
    AgentStudioSnapshot {
        templates: state.agent_templates.clone(),
        training_runs: state.agent_training_runs.clone(),
        active_template_count: state
            .agent_templates
            .iter()
            .filter(|template| template.active)
            .count() as u64,
    }
}

impl AgentTemplate {
    pub fn developer_with_pi() -> Self {
        Self {
            id: "developer-pi".to_owned(),
            name: "Developer Agent".to_owned(),
            role: "developer".to_owned(),
            description: "General implementation agent bound to the built-in Pi execution discipline harness.".to_owned(),
            provider_id: "openai".to_owned(),
            model_id: "gpt-5.4".to_owned(),
            harness_profile_id: Some("pi-execution-discipline".to_owned()),
            skill_routes: vec![
                "agenticcrew://skills/superpowers/subagent-driven-development".to_owned(),
                "agenticcrew://skills/browser/browser".to_owned(),
            ],
            budget_cents: 200,
            version: 1,
            active: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{agent_studio_snapshot_from_state, AgentTemplate};
    use crate::core::state::AgentOsState;

    #[test]
    fn built_in_developer_agent_binds_harness_and_skill_routes() {
        let template = AgentTemplate::developer_with_pi();

        assert_eq!(
            template.harness_profile_id.as_deref(),
            Some("pi-execution-discipline")
        );
        assert!(template
            .skill_routes
            .contains(&"agenticcrew://skills/superpowers/subagent-driven-development".to_owned()));
    }

    #[test]
    fn agent_studio_snapshot_counts_active_templates() {
        let state = AgentOsState::empty();

        let snapshot = agent_studio_snapshot_from_state(&state);

        assert_eq!(snapshot.active_template_count, 1);
        assert_eq!(snapshot.templates[0].id, "developer-pi");
    }
}
