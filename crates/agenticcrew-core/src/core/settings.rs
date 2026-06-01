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
    #[serde(default = "default_reasoning_effort")]
    pub reasoning_effort: ReasoningEffort,
    #[serde(default = "openai_model_registry")]
    pub available_models: Vec<AiModelRecord>,
    #[serde(default = "provider_options_registry")]
    pub provider_options: Vec<AiProviderOption>,
    #[serde(default = "default_model_sync_status")]
    pub model_sync_status: ProviderModelSyncStatus,
    #[serde(default)]
    pub models_last_synced_at: Option<String>,
    #[serde(default)]
    pub model_sync_error: Option<String>,
    pub api_key_configured: bool,
    pub api_key_last_four: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelRecord {
    pub id: String,
    pub label: String,
    pub provider_id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReasoningEffort {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderOption {
    pub provider_id: String,
    pub display_name: String,
    pub default_model_id: String,
    pub models: Vec<AiModelRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderModelSyncStatus {
    NeverSynced,
    Synced,
    Failed,
}

impl AiProviderSettings {
    pub fn openai_default() -> Self {
        Self {
            provider_id: "openai".to_owned(),
            display_name: "OpenAI".to_owned(),
            selected_model_id: "gpt-5".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            available_models: openai_model_registry(),
            provider_options: provider_options_registry(),
            model_sync_status: ProviderModelSyncStatus::NeverSynced,
            models_last_synced_at: None,
            model_sync_error: None,
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
    #[serde(default = "default_reasoning_effort")]
    pub reasoning_effort: ReasoningEffort,
    pub api_key: Option<String>,
}

impl UpdateAiProviderSettingsRequest {
    pub fn into_settings(
        self,
        previous: &AiProviderSettings,
    ) -> Result<AiProviderSettings, SettingsValidationError> {
        let provider_id = self.provider_id.trim().to_owned();
        let selected_model_id = self.selected_model_id.trim().to_owned();

        let provider = provider_option(&provider_id).ok_or_else(|| {
            SettingsValidationError::UnsupportedProvider {
                provider_id: provider_id.clone(),
            }
        })?;

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
            provider_id: provider.provider_id,
            display_name: provider.display_name,
            selected_model_id,
            reasoning_effort: self.reasoning_effort,
            available_models: if previous.provider_id == provider_id
                && !previous.available_models.is_empty()
            {
                previous.available_models.clone()
            } else {
                provider.models
            },
            provider_options: provider_options_registry(),
            model_sync_status: previous.model_sync_status.clone(),
            models_last_synced_at: previous.models_last_synced_at.clone(),
            model_sync_error: previous.model_sync_error.clone(),
            api_key_configured,
            api_key_last_four,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProviderModelsRequest {
    pub provider_id: String,
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderModelCatalogError {
    MissingApiKey,
    FetchFailed(String),
}

impl std::fmt::Display for ProviderModelCatalogError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderModelCatalogError::MissingApiKey => {
                write!(
                    formatter,
                    "OpenAI API key is required before syncing models"
                )
            }
            ProviderModelCatalogError::FetchFailed(message) => {
                write!(formatter, "OpenAI model sync failed: {message}")
            }
        }
    }
}

impl std::error::Error for ProviderModelCatalogError {}

pub trait ProviderModelCatalog {
    fn load_models(
        &self,
        request: &SyncProviderModelsRequest,
    ) -> Result<Vec<AiModelRecord>, ProviderModelCatalogError>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StaticOpenAiModelCatalog {
    models: Vec<AiModelRecord>,
}

impl StaticOpenAiModelCatalog {
    pub fn new(models: Vec<AiModelRecord>) -> Self {
        Self { models }
    }
}

impl Default for StaticOpenAiModelCatalog {
    fn default() -> Self {
        Self::new(openai_model_registry())
    }
}

impl ProviderModelCatalog for StaticOpenAiModelCatalog {
    fn load_models(
        &self,
        request: &SyncProviderModelsRequest,
    ) -> Result<Vec<AiModelRecord>, ProviderModelCatalogError> {
        if request
            .api_key
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .is_empty()
        {
            return Err(ProviderModelCatalogError::MissingApiKey);
        }

        Ok(self.models.clone())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingsValidationError {
    EmptyModel,
    EmptyModelCatalog,
    UnsupportedProvider { provider_id: String },
}

impl std::fmt::Display for SettingsValidationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SettingsValidationError::EmptyModel => write!(formatter, "model id is required"),
            SettingsValidationError::EmptyModelCatalog => {
                write!(formatter, "provider model catalog is empty")
            }
            SettingsValidationError::UnsupportedProvider { provider_id } => {
                write!(formatter, "provider '{provider_id}' is not supported")
            }
        }
    }
}

impl std::error::Error for SettingsValidationError {}

fn last_four(value: &str) -> String {
    let chars = value.chars().collect::<Vec<_>>();
    chars.iter().skip(chars.len().saturating_sub(4)).collect()
}

fn default_model_sync_status() -> ProviderModelSyncStatus {
    ProviderModelSyncStatus::NeverSynced
}

fn default_reasoning_effort() -> ReasoningEffort {
    ReasoningEffort::Medium
}

pub fn openai_model_registry() -> Vec<AiModelRecord> {
    [
        ("gpt-5.2", "GPT-5.2"),
        ("gpt-5.1", "GPT-5.1"),
        ("gpt-5", "GPT-5"),
        ("gpt-5-mini", "GPT-5 mini"),
        ("gpt-5-nano", "GPT-5 nano"),
    ]
    .into_iter()
    .map(|(id, label)| AiModelRecord {
        id: id.to_owned(),
        label: label.to_owned(),
        provider_id: "openai".to_owned(),
    })
    .collect()
}

pub fn gemini_model_registry() -> Vec<AiModelRecord> {
    [
        ("gemini-3-pro", "Gemini 3 Pro"),
        ("gemini-3-flash", "Gemini 3 Flash"),
        ("gemini-2.5-pro", "Gemini 2.5 Pro"),
        ("gemini-2.5-flash", "Gemini 2.5 Flash"),
    ]
    .into_iter()
    .map(|(id, label)| AiModelRecord {
        id: id.to_owned(),
        label: label.to_owned(),
        provider_id: "gemini".to_owned(),
    })
    .collect()
}

pub fn provider_options_registry() -> Vec<AiProviderOption> {
    vec![
        AiProviderOption {
            provider_id: "openai".to_owned(),
            display_name: "OpenAI".to_owned(),
            default_model_id: "gpt-5".to_owned(),
            models: openai_model_registry(),
        },
        AiProviderOption {
            provider_id: "gemini".to_owned(),
            display_name: "Gemini".to_owned(),
            default_model_id: "gemini-3-pro".to_owned(),
            models: gemini_model_registry(),
        },
    ]
}

fn provider_option(provider_id: &str) -> Option<AiProviderOption> {
    provider_options_registry()
        .into_iter()
        .find(|provider| provider.provider_id == provider_id)
}

pub fn sync_provider_models(
    previous: &AiProviderSettings,
    request: SyncProviderModelsRequest,
    synced_at: String,
) -> Result<AiProviderSettings, SettingsValidationError> {
    sync_provider_models_with_catalog(
        previous,
        request,
        synced_at,
        &StaticOpenAiModelCatalog::default(),
    )
}

pub fn sync_provider_models_with_catalog(
    previous: &AiProviderSettings,
    request: SyncProviderModelsRequest,
    synced_at: String,
    catalog: &impl ProviderModelCatalog,
) -> Result<AiProviderSettings, SettingsValidationError> {
    let Some(provider) = provider_option(&request.provider_id) else {
        return Err(SettingsValidationError::UnsupportedProvider {
            provider_id: request.provider_id,
        });
    };

    if request.provider_id == "gemini" {
        let mut next = previous.clone();
        next.provider_id = provider.provider_id;
        next.display_name = provider.display_name;
        next.available_models = provider.models;
        next.selected_model_id = provider.default_model_id;
        next.model_sync_status = ProviderModelSyncStatus::Synced;
        next.models_last_synced_at = Some(synced_at);
        next.model_sync_error = None;
        next.provider_options = provider_options_registry();
        return Ok(next);
    }

    let mut next = previous.clone();
    next.provider_id = "openai".to_owned();
    next.display_name = "OpenAI".to_owned();
    next.provider_options = provider_options_registry();

    let available_models = match catalog.load_models(&request) {
        Ok(models) => normalize_openai_models(models),
        Err(error) => {
            next.model_sync_status = ProviderModelSyncStatus::Failed;
            next.model_sync_error = Some(error.to_string());
            return Ok(next);
        }
    };

    if available_models.is_empty() {
        next.model_sync_status = ProviderModelSyncStatus::Failed;
        next.model_sync_error = Some(SettingsValidationError::EmptyModelCatalog.to_string());
        return Ok(next);
    }

    next.available_models = available_models;
    next.model_sync_status = ProviderModelSyncStatus::Synced;
    next.models_last_synced_at = Some(synced_at);
    next.model_sync_error = None;

    if !next
        .available_models
        .iter()
        .any(|model| model.id == next.selected_model_id)
    {
        next.selected_model_id = next
            .available_models
            .first()
            .map(|model| model.id.clone())
            .unwrap_or_else(|| previous.selected_model_id.clone());
    }

    Ok(next)
}

fn normalize_openai_models(models: Vec<AiModelRecord>) -> Vec<AiModelRecord> {
    let mut normalized = models
        .into_iter()
        .filter_map(|model| {
            let id = model.id.trim();
            if id.is_empty() {
                return None;
            }

            let label = model.label.trim();
            Some(AiModelRecord {
                id: id.to_owned(),
                label: if label.is_empty() {
                    id.to_owned()
                } else {
                    label.to_owned()
                },
                provider_id: "openai".to_owned(),
            })
        })
        .collect::<Vec<_>>();

    normalized.sort_by(|left, right| left.id.cmp(&right.id));
    normalized.dedup_by(|left, right| left.id == right.id);
    normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_snapshot_uses_openai_without_configured_key() {
        let snapshot = settings_snapshot_from_state(&AgentOsState::empty());

        assert_eq!(snapshot.ai_provider.provider_id, "openai");
        assert_eq!(snapshot.ai_provider.selected_model_id, "gpt-5");
        assert_eq!(
            snapshot.ai_provider.reasoning_effort,
            ReasoningEffort::Medium
        );
        assert!(snapshot
            .ai_provider
            .available_models
            .iter()
            .any(|model| model.id == "gpt-5.2"));
        assert!(snapshot
            .ai_provider
            .provider_options
            .iter()
            .any(|provider| provider.provider_id == "gemini"));
        assert_eq!(
            snapshot.ai_provider.model_sync_status,
            ProviderModelSyncStatus::NeverSynced
        );
        assert!(!snapshot.ai_provider.api_key_configured);
        assert_eq!(snapshot.ai_provider.api_key_last_four, None);
    }

    #[test]
    fn update_request_keeps_only_api_key_metadata() {
        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::High,
            selected_model_id: "gpt-5.1".to_owned(),
            api_key: Some("sk-proj-secret1234".to_owned()),
        }
        .into_settings(&AiProviderSettings::openai_default())
        .expect("valid settings");

        assert!(settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, Some("1234".to_owned()));
        assert_eq!(settings.reasoning_effort, ReasoningEffort::High);
    }

    #[test]
    fn update_request_can_switch_to_gemini_defaults() {
        let settings = UpdateAiProviderSettingsRequest {
            api_key: Some("AIza-secret9999".to_owned()),
            provider_id: "gemini".to_owned(),
            reasoning_effort: ReasoningEffort::Low,
            selected_model_id: "gemini-3-pro".to_owned(),
        }
        .into_settings(&AiProviderSettings::openai_default())
        .expect("Gemini should be supported");

        assert_eq!(settings.provider_id, "gemini");
        assert_eq!(settings.display_name, "Gemini");
        assert_eq!(settings.selected_model_id, "gemini-3-pro");
        assert_eq!(settings.reasoning_effort, ReasoningEffort::Low);
        assert_eq!(settings.api_key_last_four, Some("9999".to_owned()));
        assert!(settings
            .available_models
            .iter()
            .any(|model| model.id == "gemini-3-pro"));
    }

    #[test]
    fn update_request_preserves_existing_key_metadata_when_key_is_omitted() {
        let previous = AiProviderSettings {
            api_key_configured: true,
            api_key_last_four: Some("5678".to_owned()),
            available_models: openai_model_registry(),
            provider_options: provider_options_registry(),
            model_sync_status: ProviderModelSyncStatus::Synced,
            models_last_synced_at: Some("123".to_owned()),
            model_sync_error: None,
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-5".to_owned(),
        };

        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-5.2".to_owned(),
            api_key: None,
        }
        .into_settings(&previous)
        .expect("valid settings");

        assert_eq!(settings.selected_model_id, "gpt-5.2");
        assert_eq!(settings.model_sync_status, ProviderModelSyncStatus::Synced);
        assert_eq!(settings.models_last_synced_at, Some("123".to_owned()));
        assert!(settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, Some("5678".to_owned()));
    }

    #[test]
    fn update_request_clears_key_metadata_when_empty_key_is_provided() {
        let previous = AiProviderSettings {
            api_key_configured: true,
            api_key_last_four: Some("5678".to_owned()),
            available_models: openai_model_registry(),
            provider_options: provider_options_registry(),
            model_sync_status: ProviderModelSyncStatus::NeverSynced,
            models_last_synced_at: None,
            model_sync_error: None,
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-5".to_owned(),
        };

        let settings = UpdateAiProviderSettingsRequest {
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-5.2".to_owned(),
            api_key: Some(" ".to_owned()),
        }
        .into_settings(&previous)
        .expect("valid settings");

        assert!(!settings.api_key_configured);
        assert_eq!(settings.api_key_last_four, None);
    }

    #[test]
    fn sync_provider_models_records_missing_key_as_recoverable_status() {
        let settings = sync_provider_models(
            &AiProviderSettings::openai_default(),
            SyncProviderModelsRequest {
                api_key: None,
                provider_id: "openai".to_owned(),
            },
            "sync-1".to_owned(),
        )
        .expect("missing key should be a settings state, not a command crash");

        assert_eq!(settings.model_sync_status, ProviderModelSyncStatus::Failed);
        assert_eq!(
            settings.model_sync_error,
            Some("OpenAI API key is required before syncing models".to_owned())
        );
        assert_eq!(settings.models_last_synced_at, None);
    }

    #[test]
    fn sync_provider_models_caches_openai_catalog_when_key_is_configured() {
        let previous = AiProviderSettings {
            api_key_configured: true,
            api_key_last_four: Some("1234".to_owned()),
            available_models: Vec::new(),
            provider_options: provider_options_registry(),
            model_sync_status: ProviderModelSyncStatus::NeverSynced,
            models_last_synced_at: None,
            model_sync_error: Some("old failure".to_owned()),
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-5.2".to_owned(),
        };

        let settings = sync_provider_models(
            &previous,
            SyncProviderModelsRequest {
                api_key: Some("sk-test".to_owned()),
                provider_id: "openai".to_owned(),
            },
            "sync-2".to_owned(),
        )
        .expect("configured OpenAI should sync");

        assert_eq!(settings.model_sync_status, ProviderModelSyncStatus::Synced);
        assert_eq!(settings.models_last_synced_at, Some("sync-2".to_owned()));
        assert_eq!(settings.model_sync_error, None);
        assert!(settings
            .available_models
            .iter()
            .any(|model| model.id == "gpt-5.2"));
    }

    #[test]
    fn sync_provider_models_uses_injected_catalog() {
        let previous = AiProviderSettings {
            api_key_configured: false,
            api_key_last_four: None,
            available_models: openai_model_registry(),
            provider_options: provider_options_registry(),
            model_sync_status: ProviderModelSyncStatus::NeverSynced,
            models_last_synced_at: None,
            model_sync_error: None,
            display_name: "OpenAI".to_owned(),
            provider_id: "openai".to_owned(),
            reasoning_effort: ReasoningEffort::Medium,
            selected_model_id: "gpt-old".to_owned(),
        };
        let catalog = StaticOpenAiModelCatalog::new(vec![AiModelRecord {
            id: " gpt-live ".to_owned(),
            label: "".to_owned(),
            provider_id: "other".to_owned(),
        }]);

        let settings = sync_provider_models_with_catalog(
            &previous,
            SyncProviderModelsRequest {
                api_key: Some("sk-test".to_owned()),
                provider_id: "openai".to_owned(),
            },
            "sync-3".to_owned(),
            &catalog,
        )
        .expect("configured request should sync through injected catalog");

        assert_eq!(settings.model_sync_status, ProviderModelSyncStatus::Synced);
        assert_eq!(settings.selected_model_id, "gpt-live");
        assert_eq!(
            settings.available_models,
            vec![AiModelRecord {
                id: "gpt-live".to_owned(),
                label: "gpt-live".to_owned(),
                provider_id: "openai".to_owned()
            }]
        );
    }
}
