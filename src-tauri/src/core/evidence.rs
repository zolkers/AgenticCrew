use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceType {
    FileExists,
    FileModified,
    CommandExitCode,
    CommandOutputContains,
    GitDiffContains,
    DockerServiceHealthy,
    ToolCallSucceeded,
    ReviewerApproved,
    HumanApproved,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct Evidence {
    pub evidence_id: String,
    pub session_id: String,
    pub checkpoint_id: String,
    pub evidence_type: EvidenceType,
    pub command: String,
    pub exit_code: i32,
    pub created_at: String,
    pub created_by: String,
}

impl Evidence {
    pub fn command_exit_code(
        evidence_id: impl Into<String>,
        session_id: impl Into<String>,
        checkpoint_id: impl Into<String>,
        command: impl Into<String>,
        exit_code: i32,
        created_by: impl Into<String>,
        created_at: impl Into<String>,
    ) -> Self {
        Self {
            evidence_id: evidence_id.into(),
            session_id: session_id.into(),
            checkpoint_id: checkpoint_id.into(),
            evidence_type: EvidenceType::CommandExitCode,
            command: command.into(),
            exit_code,
            created_at: created_at.into(),
            created_by: created_by.into(),
        }
    }

    pub fn is_success(&self) -> bool {
        self.evidence_type == EvidenceType::CommandExitCode && self.exit_code == 0
    }
}

#[cfg(test)]
mod tests {
    use super::{Evidence, EvidenceType};

    #[test]
    fn evidence_records_command_result() {
        let evidence = Evidence {
            evidence_id: "ev_1042".to_owned(),
            session_id: "feat_todo_api".to_owned(),
            checkpoint_id: "tests_passing".to_owned(),
            evidence_type: EvidenceType::CommandExitCode,
            command: "cargo test".to_owned(),
            exit_code: 0,
            created_at: "2026-05-28T15:04:22Z".to_owned(),
            created_by: "qa".to_owned(),
        };

        assert_eq!(evidence.exit_code, 0);
        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
    }

    #[test]
    fn command_exit_code_success_records_metadata_and_is_success() {
        let evidence = Evidence::command_exit_code(
            "ev_1042",
            "feat_todo_api",
            "tests_passing",
            "cargo test",
            0,
            "qa",
            "2026-05-28T15:04:22Z",
        );

        assert_eq!(evidence.evidence_id, "ev_1042");
        assert_eq!(evidence.session_id, "feat_todo_api");
        assert_eq!(evidence.checkpoint_id, "tests_passing");
        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
        assert_eq!(evidence.command, "cargo test");
        assert_eq!(evidence.exit_code, 0);
        assert_eq!(evidence.created_by, "qa");
        assert_eq!(evidence.created_at, "2026-05-28T15:04:22Z");
        assert!(evidence.is_success());
    }

    #[test]
    fn command_exit_code_failure_is_valid_evidence_but_not_success() {
        let evidence = Evidence::command_exit_code(
            "ev_1043",
            "feat_todo_api",
            "tests_passing",
            "cargo test",
            101,
            "qa",
            "2026-05-28T15:05:00Z",
        );

        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
        assert_eq!(evidence.exit_code, 101);
        assert!(!evidence.is_success());
    }
}
