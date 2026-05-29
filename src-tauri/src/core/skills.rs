use serde::{Deserialize, Serialize};
use std::fmt;

use super::permissions::{ApprovedPermissionPolicy, PermissionGate};
use super::state::AgentOsState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceKind {
    Bundled,
    Local,
    GitHub,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceTrustLevel {
    BuiltIn,
    Local,
    External,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceActivationStatus {
    PendingValidation,
    Validated,
    Rejected,
    SyncFailed,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceSyncStatus {
    #[default]
    NeverSynced,
    Synced,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct RegisterGitHubSkillSourceRequest {
    pub id: String,
    pub repository_url: String,
    pub selected_ref: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSource {
    pub id: String,
    pub kind: SkillSourceKind,
    pub repository_url: String,
    pub selected_ref: String,
    pub trust_level: SkillSourceTrustLevel,
    pub status: SkillSourceActivationStatus,
    #[serde(default)]
    pub last_sync_status: SkillSourceSyncStatus,
    #[serde(default)]
    pub permission_gate: PermissionGate,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSourcesSnapshot {
    pub sources: Vec<SkillSource>,
    pub active_source_count: u64,
}

pub fn skill_sources_snapshot_from_state(state: &AgentOsState) -> SkillSourcesSnapshot {
    SkillSourcesSnapshot {
        sources: state.skill_sources.clone(),
        active_source_count: state
            .skill_sources
            .iter()
            .filter(|source| source.active)
            .count() as u64,
    }
}

impl SkillSource {
    pub fn github(request: RegisterGitHubSkillSourceRequest) -> Result<Self, SkillSourceError> {
        if !request.repository_url.starts_with("https://github.com/") {
            return Err(SkillSourceError::NonGitHubRepository);
        }

        if request.selected_ref.trim().is_empty() {
            return Err(SkillSourceError::EmptySelectedRef);
        }

        Ok(Self {
            id: request.id,
            kind: SkillSourceKind::GitHub,
            repository_url: request.repository_url,
            selected_ref: request.selected_ref,
            trust_level: SkillSourceTrustLevel::External,
            status: SkillSourceActivationStatus::PendingValidation,
            last_sync_status: SkillSourceSyncStatus::NeverSynced,
            permission_gate: PermissionGate::default(),
            active: false,
        })
    }

    pub fn mark_validated(&mut self) {
        self.status = SkillSourceActivationStatus::Validated;
        self.last_sync_status = SkillSourceSyncStatus::Synced;
    }

    pub fn activate(&mut self) -> Result<(), SkillSourceError> {
        if self.status != SkillSourceActivationStatus::Validated {
            return Err(SkillSourceError::NotValidated);
        }

        if !self.permission_gate.approved {
            return Err(SkillSourceError::PermissionsNotApproved);
        }

        self.active = true;

        Ok(())
    }

    pub fn approve_permissions(&mut self, policy: ApprovedPermissionPolicy) {
        self.permission_gate.approve(policy);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkillSourceError {
    NonGitHubRepository,
    EmptySelectedRef,
    NotValidated,
    PermissionsNotApproved,
}

impl fmt::Display for SkillSourceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SkillSourceError::NonGitHubRepository => {
                write!(formatter, "skill source repository must use github.com")
            }
            SkillSourceError::EmptySelectedRef => {
                write!(formatter, "skill source ref must not be empty")
            }
            SkillSourceError::NotValidated => {
                write!(
                    formatter,
                    "skill source must be validated before activation"
                )
            }
            SkillSourceError::PermissionsNotApproved => {
                write!(
                    formatter,
                    "skill source permissions must be approved before activation"
                )
            }
        }
    }
}

impl std::error::Error for SkillSourceError {}

#[cfg(test)]
mod tests {
    use super::{
        skill_sources_snapshot_from_state, RegisterGitHubSkillSourceRequest, SkillSource,
        SkillSourceActivationStatus, SkillSourceKind, SkillSourceSyncStatus, SkillSourceTrustLevel,
    };
    use crate::core::permissions::{
        ApprovedPermissionPolicy, CommandPermissionScope, FileSystemPermissionScope,
        NetworkPermissionScope,
    };
    use crate::core::state::AgentOsState;

    #[test]
    fn github_skill_source_starts_pending_and_inactive() {
        let source = SkillSource::github(RegisterGitHubSkillSourceRequest {
            id: "superpowers".to_owned(),
            repository_url: "https://github.com/obra/superpowers".to_owned(),
            selected_ref: "main".to_owned(),
        })
        .expect("github skill source should be accepted");

        assert_eq!(source.id, "superpowers");
        assert_eq!(source.kind, SkillSourceKind::GitHub);
        assert_eq!(source.repository_url, "https://github.com/obra/superpowers");
        assert_eq!(source.selected_ref, "main");
        assert_eq!(source.trust_level, SkillSourceTrustLevel::External);
        assert_eq!(
            source.status,
            SkillSourceActivationStatus::PendingValidation
        );
        assert_eq!(source.last_sync_status, SkillSourceSyncStatus::NeverSynced);
        assert!(!source.active);
        assert!(!source.permission_gate.approved);
        assert!(source.permission_gate.policy.file_system.is_empty());
        assert!(source.permission_gate.policy.network.is_empty());
        assert!(source.permission_gate.policy.commands.is_empty());
        assert!(!source.permission_gate.policy.git);
        assert!(!source.permission_gate.policy.docker);
    }

    #[test]
    fn validated_github_skill_source_records_successful_sync() {
        let mut source = github_skill_source();

        source.mark_validated();

        assert_eq!(source.status, SkillSourceActivationStatus::Validated);
        assert_eq!(source.last_sync_status, SkillSourceSyncStatus::Synced);
        assert!(!source.active);
    }

    #[test]
    fn validated_skill_sources_still_require_approved_permissions_to_activate() {
        let mut pending_source = github_skill_source();

        let error = pending_source
            .activate()
            .expect_err("pending source should not activate");

        assert_eq!(
            error.to_string(),
            "skill source must be validated before activation"
        );

        pending_source.mark_validated();
        let error = pending_source
            .activate()
            .expect_err("validated source without permissions should not activate");

        assert_eq!(
            error.to_string(),
            "skill source permissions must be approved before activation"
        );

        pending_source.approve_permissions(sample_permission_policy());
        pending_source
            .activate()
            .expect("validated source with approved permissions should activate");

        assert!(pending_source.active);
    }

    #[test]
    fn approved_skill_source_permissions_record_user_approved_scopes() {
        let mut source = github_skill_source();

        source.approve_permissions(sample_permission_policy());

        assert!(source.permission_gate.approved);
        assert_eq!(
            source.permission_gate.policy.file_system,
            vec![FileSystemPermissionScope {
                path: "workspaces/research".to_owned(),
                writable: true,
            }]
        );
        assert!(source.permission_gate.policy.git);
        assert!(!source.permission_gate.policy.docker);
        assert_eq!(
            source.permission_gate.policy.network,
            vec![NetworkPermissionScope {
                host: "api.github.com".to_owned(),
            }]
        );
        assert_eq!(
            source.permission_gate.policy.commands,
            vec![CommandPermissionScope {
                command: "git".to_owned(),
            }]
        );
    }

    #[test]
    fn github_skill_source_rejects_non_github_urls() {
        let error = SkillSource::github(RegisterGitHubSkillSourceRequest {
            id: "bad".to_owned(),
            repository_url: "https://example.com/obra/superpowers".to_owned(),
            selected_ref: "main".to_owned(),
        })
        .expect_err("non-github source should be rejected");

        assert_eq!(
            error.to_string(),
            "skill source repository must use github.com"
        );
    }

    #[test]
    fn github_skill_source_rejects_unpinned_empty_ref() {
        let error = SkillSource::github(RegisterGitHubSkillSourceRequest {
            id: "superpowers".to_owned(),
            repository_url: "https://github.com/obra/superpowers".to_owned(),
            selected_ref: " ".to_owned(),
        })
        .expect_err("empty ref should be rejected");

        assert_eq!(error.to_string(), "skill source ref must not be empty");
    }

    #[test]
    fn skill_sources_snapshot_reports_registered_sources() {
        let mut state = AgentOsState::empty();
        state
            .register_github_skill_source(RegisterGitHubSkillSourceRequest {
                id: "superpowers".to_owned(),
                repository_url: "https://github.com/obra/superpowers".to_owned(),
                selected_ref: "main".to_owned(),
            })
            .expect("skill source should register");

        let snapshot = skill_sources_snapshot_from_state(&state);

        assert_eq!(snapshot.sources.len(), 1);
        assert_eq!(snapshot.sources[0].id, "superpowers");
        assert_eq!(snapshot.sources[0].kind, SkillSourceKind::GitHub);
        assert_eq!(
            snapshot.sources[0].status,
            SkillSourceActivationStatus::PendingValidation
        );
        assert_eq!(
            snapshot.sources[0].last_sync_status,
            SkillSourceSyncStatus::NeverSynced
        );
        assert_eq!(snapshot.active_source_count, 0);
    }

    #[test]
    fn skill_sources_snapshot_serializes_with_frontend_contract_names() {
        let snapshot = skill_sources_snapshot_from_state(&AgentOsState::empty());
        let serialized = serde_json::to_value(snapshot).expect("snapshot should serialize");

        assert_eq!(
            serialized,
            serde_json::json!({
                "activeSourceCount": 0,
                "sources": []
            })
        );
    }

    fn github_skill_source() -> SkillSource {
        SkillSource::github(RegisterGitHubSkillSourceRequest {
            id: "superpowers".to_owned(),
            repository_url: "https://github.com/obra/superpowers".to_owned(),
            selected_ref: "main".to_owned(),
        })
        .expect("github skill source should be accepted")
    }

    fn sample_permission_policy() -> ApprovedPermissionPolicy {
        ApprovedPermissionPolicy {
            file_system: vec![FileSystemPermissionScope {
                path: "workspaces/research".to_owned(),
                writable: true,
            }],
            git: true,
            docker: false,
            network: vec![NetworkPermissionScope {
                host: "api.github.com".to_owned(),
            }],
            commands: vec![CommandPermissionScope {
                command: "git".to_owned(),
            }],
        }
    }
}
