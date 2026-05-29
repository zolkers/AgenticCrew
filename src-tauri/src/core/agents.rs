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

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentTemplateRequest {
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
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAgentTemplateActiveRequest {
    pub template_id: String,
    pub active: bool,
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

    pub fn local(request: CreateAgentTemplateRequest) -> Result<Self, AgentTemplateError> {
        let id = validate_identifier("agent template id", request.id)?;
        let name = validate_required("agent template name", request.name)?;
        let role = validate_required("agent role", request.role)?;
        let description = validate_required("agent description", request.description)?;
        let provider_id = validate_identifier("provider id", request.provider_id)?;
        let model_id = validate_required("model id", request.model_id)?;
        let skill_routes = request
            .skill_routes
            .into_iter()
            .map(|route| validate_required("skill route", route))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Self {
            id,
            name,
            role,
            description,
            provider_id,
            model_id,
            harness_profile_id: request
                .harness_profile_id
                .and_then(|profile_id| {
                    let trimmed = profile_id.trim().to_owned();
                    (!trimmed.is_empty()).then_some(trimmed)
                }),
            skill_routes,
            budget_cents: request.budget_cents,
            version: 1,
            active: request.active,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AgentTemplateError {
    EmptyField { field: &'static str },
    InvalidIdentifier { field: &'static str, value: String },
}

impl std::fmt::Display for AgentTemplateError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentTemplateError::EmptyField { field } => write!(formatter, "{field} is required"),
            AgentTemplateError::InvalidIdentifier { field, value } => {
                write!(formatter, "{field} '{value}' must use lowercase letters, numbers, '-' or '_'")
            }
        }
    }
}

impl std::error::Error for AgentTemplateError {}

fn validate_required(field: &'static str, value: String) -> Result<String, AgentTemplateError> {
    let value = value.trim();

    if value.is_empty() {
        return Err(AgentTemplateError::EmptyField { field });
    }

    Ok(value.to_owned())
}

fn validate_identifier(field: &'static str, value: String) -> Result<String, AgentTemplateError> {
    let value = validate_required(field, value)?;
    let is_valid = value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(AgentTemplateError::InvalidIdentifier { field, value });
    }

    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::{agent_studio_snapshot_from_state, AgentTemplate, CreateAgentTemplateRequest};
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

    #[test]
    fn local_agent_template_trims_fields_and_routes() {
        let template = AgentTemplate::local(CreateAgentTemplateRequest {
            active: true,
            budget_cents: 350,
            description: " Builds UI ".to_owned(),
            harness_profile_id: Some(" pi-execution-discipline ".to_owned()),
            id: "ui-agent".to_owned(),
            model_id: " gpt-5.2 ".to_owned(),
            name: " UI Agent ".to_owned(),
            provider_id: "openai".to_owned(),
            role: "developer".to_owned(),
            skill_routes: vec![" agenticcrew://skills/ui ".to_owned()],
        })
        .expect("agent should validate");

        assert_eq!(template.id, "ui-agent");
        assert_eq!(template.name, "UI Agent");
        assert_eq!(template.model_id, "gpt-5.2");
        assert_eq!(
            template.harness_profile_id.as_deref(),
            Some("pi-execution-discipline")
        );
        assert_eq!(template.skill_routes, vec!["agenticcrew://skills/ui"]);
    }
}
