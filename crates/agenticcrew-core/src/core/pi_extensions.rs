use serde::{Deserialize, Serialize};

use super::harnesses::{HarnessModule, HarnessModuleKind, HarnessModuleSource, HarnessTrustLevel};

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PiExtension {
    pub id: String,
    pub name: String,
    pub description: String,
    pub route: String,
    pub modules: Vec<HarnessModule>,
    pub active: bool,
    pub inspected: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPiExtensionRequest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub base_policy: String,
    #[serde(default)]
    pub behavior_rules: Vec<String>,
    #[serde(default)]
    pub tool_rules: Vec<String>,
    #[serde(default)]
    pub safety_rules: Vec<String>,
    pub output_style: Option<String>,
    pub project_memory: Option<String>,
    pub agent_persona: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetPiExtensionActiveRequest {
    pub extension_id: String,
    pub active: bool,
}

impl PiExtension {
    pub fn imported(request: ImportPiExtensionRequest) -> Result<Self, PiExtensionError> {
        let id = validate_identifier("PI extension id", request.id)?;
        let name = validate_required("PI extension name", request.name)?;
        let description = validate_required("PI extension description", request.description)?;
        let route = format!("agenticcrew://pi/local/{id}");
        let mut modules = vec![module(
            &id,
            "base-policy",
            "Base Policy",
            HarnessModuleKind::BasePolicy,
            request.base_policy,
        )?];

        modules.extend(optional_modules(
            &id,
            "behavior-rule",
            "Behavior Rule",
            HarnessModuleKind::BehaviorRule,
            request.behavior_rules,
        )?);
        modules.extend(optional_modules(
            &id,
            "tool-rule",
            "Tool Rule",
            HarnessModuleKind::ToolRule,
            request.tool_rules,
        )?);
        modules.extend(optional_modules(
            &id,
            "safety-rule",
            "Safety Rule",
            HarnessModuleKind::SafetyRule,
            request.safety_rules,
        )?);
        modules.extend(optional_single_module(
            &id,
            "output-style",
            "Output Style",
            HarnessModuleKind::OutputStyle,
            request.output_style,
        )?);
        modules.extend(optional_single_module(
            &id,
            "project-memory",
            "Project Memory",
            HarnessModuleKind::ProjectMemory,
            request.project_memory,
        )?);
        modules.extend(optional_single_module(
            &id,
            "agent-persona",
            "Agent Persona",
            HarnessModuleKind::AgentPersona,
            request.agent_persona,
        )?);

        Ok(Self {
            active: false,
            description,
            id,
            inspected: true,
            modules,
            name,
            route,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PiExtensionError {
    EmptyField { field: &'static str },
    InvalidIdentifier { field: &'static str, value: String },
}

impl std::fmt::Display for PiExtensionError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PiExtensionError::EmptyField { field } => write!(formatter, "{field} is required"),
            PiExtensionError::InvalidIdentifier { field, value } => {
                write!(
                    formatter,
                    "{field} '{value}' must use lowercase letters, numbers, '-' or '_'"
                )
            }
        }
    }
}

impl std::error::Error for PiExtensionError {}

fn optional_single_module(
    extension_id: &str,
    module_id: &'static str,
    name: &'static str,
    kind: HarnessModuleKind,
    content: Option<String>,
) -> Result<Vec<HarnessModule>, PiExtensionError> {
    content
        .map(|content| {
            module(extension_id, module_id, name, kind, content).map(|module| vec![module])
        })
        .unwrap_or_else(|| Ok(Vec::new()))
}

fn optional_modules(
    extension_id: &str,
    module_id: &'static str,
    name: &'static str,
    kind: HarnessModuleKind,
    contents: Vec<String>,
) -> Result<Vec<HarnessModule>, PiExtensionError> {
    contents
        .into_iter()
        .enumerate()
        .map(|(index, content)| {
            module(
                extension_id,
                &format!("{module_id}-{}", index + 1),
                name,
                kind,
                content,
            )
        })
        .collect()
}

fn module(
    extension_id: &str,
    module_id: &str,
    name: &str,
    kind: HarnessModuleKind,
    content: String,
) -> Result<HarnessModule, PiExtensionError> {
    let content = validate_required("PI extension module content", content)?;

    Ok(HarnessModule {
        content,
        enabled: true,
        id: format!("{extension_id}/{module_id}"),
        kind,
        name: name.to_owned(),
        source: HarnessModuleSource {
            route: Some(format!("agenticcrew://pi/local/{extension_id}")),
            source_id: extension_id.to_owned(),
            trust_level: HarnessTrustLevel::Local,
        },
        version: "1".to_owned(),
    })
}

fn validate_required(field: &'static str, value: String) -> Result<String, PiExtensionError> {
    let value = value.trim();

    if value.is_empty() {
        return Err(PiExtensionError::EmptyField { field });
    }

    Ok(value.to_owned())
}

fn validate_identifier(field: &'static str, value: String) -> Result<String, PiExtensionError> {
    let value = validate_required(field, value)?;
    let is_valid = value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(PiExtensionError::InvalidIdentifier { field, value });
    }

    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::{ImportPiExtensionRequest, PiExtension};
    use crate::core::harnesses::HarnessModuleKind;

    #[test]
    fn imported_pi_extension_builds_inspected_inactive_modules() {
        let extension = PiExtension::imported(ImportPiExtensionRequest {
            agent_persona: Some("Act as a careful release engineer.".to_owned()),
            base_policy: "Require evidence before claims.".to_owned(),
            behavior_rules: vec!["Prefer narrow diffs.".to_owned()],
            description: "Release policy".to_owned(),
            id: "release-pi".to_owned(),
            name: "Release PI".to_owned(),
            output_style: None,
            project_memory: None,
            safety_rules: Vec::new(),
            tool_rules: vec!["Use git status before patching.".to_owned()],
        })
        .expect("extension should validate");

        assert!(!extension.active);
        assert!(extension.inspected);
        assert_eq!(extension.route, "agenticcrew://pi/local/release-pi");
        assert_eq!(extension.modules.len(), 4);
        assert_eq!(extension.modules[0].kind, HarnessModuleKind::BasePolicy);
        assert!(extension.modules[0]
            .content
            .contains("Require evidence before claims"));
    }

    #[test]
    fn imported_pi_extension_rejects_empty_module_content() {
        let error = PiExtension::imported(ImportPiExtensionRequest {
            agent_persona: None,
            base_policy: " ".to_owned(),
            behavior_rules: Vec::new(),
            description: "Release policy".to_owned(),
            id: "release-pi".to_owned(),
            name: "Release PI".to_owned(),
            output_style: None,
            project_memory: None,
            safety_rules: Vec::new(),
            tool_rules: Vec::new(),
        })
        .expect_err("empty base policy should fail");

        assert_eq!(error.to_string(), "PI extension module content is required");
    }
}
