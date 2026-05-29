use serde::{Deserialize, Serialize};

use super::state::AgentOsState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HarnessModuleKind {
    BasePolicy,
    BehaviorRule,
    ToolRule,
    SafetyRule,
    OutputStyle,
    ProjectMemory,
    AgentPersona,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessModule {
    pub id: String,
    pub name: String,
    pub kind: HarnessModuleKind,
    pub source: HarnessModuleSource,
    pub version: String,
    pub content: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessModuleSource {
    pub source_id: String,
    pub route: Option<String>,
    pub trust_level: HarnessTrustLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HarnessTrustLevel {
    BuiltIn,
    Local,
    External,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub modules: Vec<HarnessModule>,
    #[serde(default)]
    pub skill_routes: Vec<String>,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessBinding {
    pub target_kind: HarnessBindingTargetKind,
    pub target_id: String,
    pub harness_profile_id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HarnessBindingTargetKind {
    Workspace,
    Agent,
    Skill,
    Run,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessStudioSnapshot {
    pub profiles: Vec<HarnessProfile>,
    pub bindings: Vec<HarnessBinding>,
    pub active_profile_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateHarnessProfileRequest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub base_policy: String,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetHarnessProfileActiveRequest {
    pub profile_id: String,
    pub active: bool,
}

pub fn harness_studio_snapshot_from_state(state: &AgentOsState) -> HarnessStudioSnapshot {
    HarnessStudioSnapshot {
        profiles: state.harness_profiles.clone(),
        bindings: state.harness_bindings.clone(),
        active_profile_count: state
            .harness_profiles
            .iter()
            .filter(|profile| profile.active)
            .count() as u64,
    }
}

impl HarnessProfile {
    pub fn pi_execution_discipline() -> Self {
        Self {
            id: "pi-execution-discipline".to_owned(),
            name: "Pi Execution Discipline".to_owned(),
            description: "Built-in execution policy for targeted inspection, precise edits, root-cause fixes, and validation before final claims.".to_owned(),
            version: "1".to_owned(),
            modules: vec![HarnessModule {
                id: "pi-execution-discipline/base-policy".to_owned(),
                name: "Execution Discipline".to_owned(),
                kind: HarnessModuleKind::BasePolicy,
                source: HarnessModuleSource {
                    source_id: "builtin-pi".to_owned(),
                    route: Some("agenticcrew://harnesses/builtin-pi/pi-execution-discipline".to_owned()),
                    trust_level: HarnessTrustLevel::BuiltIn,
                },
                version: "1".to_owned(),
                content: "Use targeted inspection before broad reads. Prefer precise edits with minimal changed text. Use parallel independent inspection for unrelated files or commands. Fix root causes instead of symptoms. Always validate before final claims. Keep output concise and relevant.".to_owned(),
                enabled: true,
            }],
            skill_routes: Vec::new(),
            active: true,
        }
    }

    pub fn local(request: CreateHarnessProfileRequest) -> Result<Self, HarnessProfileError> {
        let id = validate_identifier("harness profile id", request.id)?;
        let name = validate_required("harness profile name", request.name)?;
        let description = validate_required("harness profile description", request.description)?;
        let base_policy = validate_required("base policy", request.base_policy)?;

        Ok(Self {
            id: id.clone(),
            name,
            description,
            version: "1".to_owned(),
            modules: vec![HarnessModule {
                id: format!("{id}/base-policy"),
                name: "Base Policy".to_owned(),
                kind: HarnessModuleKind::BasePolicy,
                source: HarnessModuleSource {
                    source_id: "local".to_owned(),
                    route: Some(format!("agenticcrew://harnesses/local/{id}")),
                    trust_level: HarnessTrustLevel::Local,
                },
                version: "1".to_owned(),
                content: base_policy,
                enabled: true,
            }],
            skill_routes: Vec::new(),
            active: request.active,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HarnessProfileError {
    EmptyField { field: &'static str },
    InvalidIdentifier { field: &'static str, value: String },
}

impl std::fmt::Display for HarnessProfileError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HarnessProfileError::EmptyField { field } => write!(formatter, "{field} is required"),
            HarnessProfileError::InvalidIdentifier { field, value } => {
                write!(formatter, "{field} '{value}' must use lowercase letters, numbers, '-' or '_'")
            }
        }
    }
}

impl std::error::Error for HarnessProfileError {}

fn validate_required(
    field: &'static str,
    value: String,
) -> Result<String, HarnessProfileError> {
    let value = value.trim();

    if value.is_empty() {
        return Err(HarnessProfileError::EmptyField { field });
    }

    Ok(value.to_owned())
}

fn validate_identifier(
    field: &'static str,
    value: String,
) -> Result<String, HarnessProfileError> {
    let value = validate_required(field, value)?;
    let is_valid = value
        .chars()
        .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-' || character == '_');

    if !is_valid {
        return Err(HarnessProfileError::InvalidIdentifier { field, value });
    }

    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::{harness_studio_snapshot_from_state, CreateHarnessProfileRequest, HarnessProfile};
    use crate::core::state::AgentOsState;

    #[test]
    fn built_in_pi_harness_profile_has_stable_route() {
        let profile = HarnessProfile::pi_execution_discipline();

        assert_eq!(profile.id, "pi-execution-discipline");
        assert_eq!(
            profile.modules[0].source.route.as_deref(),
            Some("agenticcrew://harnesses/builtin-pi/pi-execution-discipline")
        );
        assert!(profile.active);
    }

    #[test]
    fn harness_snapshot_counts_active_profiles() {
        let state = AgentOsState::empty();

        let snapshot = harness_studio_snapshot_from_state(&state);

        assert_eq!(snapshot.active_profile_count, 1);
        assert_eq!(snapshot.profiles[0].id, "pi-execution-discipline");
    }

    #[test]
    fn local_harness_profile_has_route_and_base_policy_module() {
        let profile = HarnessProfile::local(CreateHarnessProfileRequest {
            active: false,
            base_policy: "Use strict tests before merge.".to_owned(),
            description: "Local profile".to_owned(),
            id: "local-strict".to_owned(),
            name: "Local Strict".to_owned(),
        })
        .expect("local harness should validate");

        assert_eq!(profile.id, "local-strict");
        assert!(!profile.active);
        assert_eq!(profile.modules[0].content, "Use strict tests before merge.");
        assert_eq!(
            profile.modules[0].source.route.as_deref(),
            Some("agenticcrew://harnesses/local/local-strict")
        );
    }
}
