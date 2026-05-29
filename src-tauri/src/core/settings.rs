use serde::{Deserialize, Serialize};

use super::state::AgentOsState;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSettings {
    pub ai_provider: AiProviderSettings,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            ai_provider: AiProviderSettings::openai_default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderSettings {
    pub provider_id: String,
    pub display_name: String,
    pub selected_model_id: String,
    pub api_key_configured: bool,
    pub api_key_last_four: Option<String>,
}

impl AiProviderSettings {
    pub fn openai_default() -> Self {
        Self {
            provider_id: "openai".to_owned(),
            display_name: "OpenAI".to_owned(),
            selected_model_id: "gpt-5".to_owned(),
            api_key_configured: false,
            api_key_last_four: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    pub ai_provider: AiProviderSettings,
}

pub fn settings_snapshot_from_state(state: &AgentOsState) -> SettingsSnapshot {
    SettingsSnapshot {
        ai_provider: state.desktop_settings.ai_provider.clone(),
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAiProviderSettingsRequest {
    pub provider_id: String,
    pub selected_model_id: String,
    pub api_key: Option<String>,
}

impl UpdateAiProviderSettingsRequest {
    pub fn into_settings(
        self,
        previous: &AiProviderSettings,
    ) -> Result<AiProviderSettings, SettingsValidationError> {
        if self.provider_id != "openai" {
            return Err(SettingsValidationError::UnsupportedProvider {
                provider_id: self.provider_id,
            });
        }

        let selected_model_id = self.selected_model_id.trim();
        if selected_model_id.is_empty() {
            return Err(SettingsValidationError::EmptyModel);
        }

        let (api_key_configured, api_key_last_four) = match self.api_key {
            Some(api_key) => {
                let trimmed_key = api_key.trim();

                if trimmed_key.is_empty() {
                    (false, None)
                } else {
                    (true, Some(last_four(trimmed_key)))
                }
            }
            None => (
                previous.api_key_configured,
                previous.api_key_last_four.clone(),
            ),
        };

        Ok(AiProviderSettings {
            provider_id: "openai".to_owned(),
            display_name: "OpenAI".to_owned(),
            selected_model_id: selected_model_id.to_owned(),
            api_key_configured,
            api_key_last_four,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingsValidationError {
    EmptyModel,
    UnsupportedProvider { provider_id: String },
}

impl std::fmt::Display for SettingsValidationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SettingsValidationError::EmptyModel => write!(formatter, "model id is required"),
            SettingsValidationError::UnsupportedProvider { provider_id } => {
                write!(formatter, "provider '{provider_id}' is not supported")
            }
        }
    }
}

impl std::error::Error for SettingsValidationError {}

fn last_four(value: &str) -> String {
    let chars = value.chars().collect::<Vec<_>>();
    chars
        .iter()
        .skip(chars.len().saturating_sub(4))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_snapshot_uses_openai_without_configured_key() {
        let snapshot = settings_snapshot_from_state(&AgentOsState::empty());

        assert_eq!(snapshot.ai_provider.provider_id, "openai");
        assert_eq!(snapshot.ai_provider.selected_model_id, "gpt-5");
        assert!(!snapshot.ai_provider.api_key_configured);
        assert_eq!(snapshot.ai_provider.api_key_last_four, None);
    }

    #[test]
    fn update_request_keeps_only_api_key_metadata() {
        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            selected_model_id: "gpt-5.1".to_owned(),
            api_key: Some("sk-proj-secret1234".to_owned()),
        }
        .into_settings(&AiProviderSettings::openai_default())
        .expect("valid settings");

        assert!(settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, Some("1234".to_owned()));
    }

    #[test]
    fn update_request_preserves_existing_key_metadata_when_key_is_omitted() {
        let previous = AiProviderSettings {
            api_key_configured: true,
            api_key_last_four: Some("5678".to_owned()),
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            selected_model_id: "gpt-5".to_owned(),
        };

        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            selected_model_id: "gpt-5.2".to_owned(),
            api_key: None,
        }
        .into_settings(&previous)
        .expect("valid settings");

        assert_eq!(settings.selected_model_id, "gpt-5.2");
        assert!(settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, Some("5678".to_owned()));
    }

    #[test]
    fn update_request_clears_key_metadata_when_empty_key_is_provided() {
        let previous = AiProviderSettings {
            api_key_configured: true,
            api_key_last_four: Some("5678".to_owned()),
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            selected_model_id: "gpt-5".to_owned(),
        };

        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            selected_model_id: "gpt-5.2".to_owned(),
            api_key: Some(" ".to_owned()),
        }
        .into_settings(&previous)
        .expect("valid settings");

        assert!(!settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, None);
    }
}
