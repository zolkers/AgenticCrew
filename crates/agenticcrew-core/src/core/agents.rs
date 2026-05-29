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

impl AgentTrainingRun {
    pub fn promote_to_version(&mut self, version: u32) {
        self.status = AgentTrainingStatus::Promoted;
        self.promoted_version = Some(version);
    }
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
    pub version_summaries: Vec<AgentVersionSummary>,
    pub active_template_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentVersionSummary {
    pub active: bool,
    pub current_version: u32,
    pub latest_training_status: Option<AgentTrainingStatus>,
    pub promoted_training_count: u64,
    pub template_id: String,
    pub template_name: String,
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

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromoteAgentTrainingRunRequest {
    pub training_run_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAgentTemplateRequest {
    pub template_id: String,
    pub name: String,
    pub role: String,
    pub description: String,
    pub provider_id: String,
    pub model_id: String,
    pub harness_profile_id: Option<String>,
    #[serde(default)]
    pub skill_routes: Vec<String>,
    pub budget_cents: u64,
}

pub fn agent_studio_snapshot_from_state(state: &AgentOsState) -> AgentStudioSnapshot {
    AgentStudioSnapshot {
        active_template_count: state
            .agent_templates
            .iter()
            .filter(|template| template.active)
            .count() as u64,
        templates: state.agent_templates.clone(),
        training_runs: state.agent_training_runs.clone(),
        version_summaries: agent_version_summaries(
            &state.agent_templates,
            &state.agent_training_runs,
        ),
    }
}

fn agent_version_summaries(
    templates: &[AgentTemplate],
    training_runs: &[AgentTrainingRun],
) -> Vec<AgentVersionSummary> {
    templates
        .iter()
        .map(|template| {
            let matching_runs = training_runs
                .iter()
                .filter(|run| run.agent_template_id == template.id)
                .collect::<Vec<_>>();

            AgentVersionSummary {
                active: template.active,
                current_version: template.version,
                latest_training_status: matching_runs.last().map(|run| run.status),
                promoted_training_count: matching_runs
                    .iter()
                    .filter(|run| run.promoted_version.is_some())
                    .count() as u64,
                template_id: template.id.clone(),
                template_name: template.name.clone(),
            }
        })
        .collect()
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
            harness_profile_id: request.harness_profile_id.and_then(|profile_id| {
                let trimmed = profile_id.trim().to_owned();
                (!trimmed.is_empty()).then_some(trimmed)
            }),
            skill_routes,
            budget_cents: request.budget_cents,
            version: 1,
            active: request.active,
        })
    }

    pub fn update_from(
        &mut self,
        request: UpdateAgentTemplateRequest,
    ) -> Result<(), AgentTemplateError> {
        self.name = validate_required("agent template name", request.name)?;
        self.role = validate_required("agent role", request.role)?;
        self.description = validate_required("agent description", request.description)?;
        self.provider_id = validate_identifier("provider id", request.provider_id)?;
        self.model_id = validate_required("model id", request.model_id)?;
        self.harness_profile_id = request.harness_profile_id.and_then(|profile_id| {
            let trimmed = profile_id.trim().to_owned();
            (!trimmed.is_empty()).then_some(trimmed)
        });
        self.skill_routes = request
            .skill_routes
            .into_iter()
            .map(|route| validate_required("skill route", route))
            .collect::<Result<Vec<_>, _>>()?;
        self.budget_cents = request.budget_cents;
        self.version = self.version.saturating_add(1);

        Ok(())
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
                write!(
                    formatter,
                    "{field} '{value}' must use lowercase letters, numbers, '-' or '_'"
                )
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
    use super::{
        agent_studio_snapshot_from_state, AgentTemplate, AgentTrainingRun, AgentTrainingStatus,
        CreateAgentTemplateRequest, UpdateAgentTemplateRequest,
    };
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
        assert_eq!(snapshot.version_summaries.len(), 1);
        assert_eq!(snapshot.version_summaries[0].template_id, "developer-pi");
        assert_eq!(snapshot.version_summaries[0].current_version, 1);
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

    #[test]
    fn update_agent_template_changes_guidance_and_bumps_version() {
        let mut template = AgentTemplate::local(CreateAgentTemplateRequest {
            active: true,
            budget_cents: 350,
            description: "Builds UI".to_owned(),
            harness_profile_id: Some("pi-execution-discipline".to_owned()),
            id: "ui-agent".to_owned(),
            model_id: "gpt-5.2".to_owned(),
            name: "UI Agent".to_owned(),
            provider_id: "openai".to_owned(),
            role: "developer".to_owned(),
            skill_routes: vec!["agenticcrew://skills/ui".to_owned()],
        })
        .expect("agent should validate");

        template
            .update_from(UpdateAgentTemplateRequest {
                budget_cents: 500,
                description: " Reviews UI diffs ".to_owned(),
                harness_profile_id: None,
                model_id: " gpt-5.1 ".to_owned(),
                name: " Review Agent ".to_owned(),
                provider_id: "openai".to_owned(),
                role: "reviewer".to_owned(),
                skill_routes: vec![" agenticcrew://skills/review ".to_owned()],
                template_id: "ui-agent".to_owned(),
            })
            .expect("agent should update");

        assert_eq!(template.name, "Review Agent");
        assert_eq!(template.role, "reviewer");
        assert_eq!(template.description, "Reviews UI diffs");
        assert_eq!(template.model_id, "gpt-5.1");
        assert_eq!(template.harness_profile_id, None);
        assert_eq!(template.skill_routes, vec!["agenticcrew://skills/review"]);
        assert_eq!(template.budget_cents, 500);
        assert_eq!(template.version, 2);
    }

    #[test]
    fn training_run_promotion_records_version() {
        let mut run = AgentTrainingRun {
            agent_template_id: "developer-pi".to_owned(),
            critic_score: Some(93),
            dataset_id: "release".to_owned(),
            id: "train-release".to_owned(),
            promoted_version: None,
            status: AgentTrainingStatus::Completed,
        };

        run.promote_to_version(2);

        assert_eq!(run.status, AgentTrainingStatus::Promoted);
        assert_eq!(run.promoted_version, Some(2));
    }
}
