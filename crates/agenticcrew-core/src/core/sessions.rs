use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckpointStatus {
    Pending,
    Running,
    Passed,
    Failed,
    Blocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DesignSessionStatus {
    Drafting,
    Reviewing,
    Approved,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FeatureSessionStatus {
    Draft,
    Opened,
    Planning,
    Running,
    Blocked,
    Validating,
    Closing,
    Closed,
    Archived,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SessionTransitionError {
    CheckpointNotPassed {
        checkpoint_id: String,
        status: CheckpointStatus,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct GoalObject {
    pub id: String,
    pub title: String,
    pub definition_of_done: Vec<String>,
    pub constraints: Vec<String>,
    pub out_of_scope: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct Checkpoint {
    pub id: String,
    pub label: String,
    pub owner_agent: String,
    pub required_evidence: Vec<String>,
    pub status: CheckpointStatus,
}

impl Checkpoint {
    pub fn new(
        id: impl Into<String>,
        label: impl Into<String>,
        owner_agent: impl Into<String>,
        required_evidence: Vec<&str>,
    ) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            owner_agent: owner_agent.into(),
            required_evidence: required_evidence.into_iter().map(str::to_owned).collect(),
            status: CheckpointStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct DesignSession {
    pub id: String,
    pub title: String,
    pub goal_object_id: String,
    pub status: DesignSessionStatus,
    pub requires_approval: bool,
}

impl DesignSession {
    pub fn new(
        id: impl Into<String>,
        title: impl Into<String>,
        goal_object_id: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            goal_object_id: goal_object_id.into(),
            status: DesignSessionStatus::Drafting,
            requires_approval: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct FeatureSession {
    pub id: String,
    pub title: String,
    pub goal_object_id: String,
    pub team_id: String,
    pub branch: String,
    pub checkpoints: Vec<Checkpoint>,
    pub status: FeatureSessionStatus,
}

impl FeatureSession {
    pub fn new(
        id: impl Into<String>,
        title: impl Into<String>,
        goal_object_id: impl Into<String>,
        team_id: impl Into<String>,
        branch: impl Into<String>,
        checkpoints: Vec<Checkpoint>,
    ) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            goal_object_id: goal_object_id.into(),
            team_id: team_id.into(),
            branch: branch.into(),
            checkpoints,
            status: FeatureSessionStatus::Draft,
        }
    }

    pub fn close(mut self) -> Result<Self, SessionTransitionError> {
        if let Some(checkpoint) = self
            .checkpoints
            .iter()
            .find(|checkpoint| checkpoint.status != CheckpointStatus::Passed)
        {
            return Err(SessionTransitionError::CheckpointNotPassed {
                checkpoint_id: checkpoint.id.clone(),
                status: checkpoint.status,
            });
        }

        self.status = FeatureSessionStatus::Closed;
        Ok(self)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        Checkpoint, CheckpointStatus, DesignSession, DesignSessionStatus, FeatureSession,
        FeatureSessionStatus, GoalObject, SessionTransitionError,
    };

    #[test]
    fn feature_session_starts_as_draft() {
        let checkpoint = Checkpoint::new(
            "tests_passing",
            "Tests passing",
            "qa",
            vec!["command_exit_code"],
        );
        let session = FeatureSession::new(
            "feat_todo_api",
            "Build TODO API",
            "goal_todo_api",
            "coding_team",
            "feat/todo-api",
            vec![checkpoint],
        );

        assert_eq!(session.status, FeatureSessionStatus::Draft);
        assert_eq!(session.checkpoints[0].status, CheckpointStatus::Pending);
    }

    #[test]
    fn feature_session_closes_when_all_checkpoints_passed() {
        let mut checkpoint = Checkpoint::new(
            "tests_passing",
            "Tests passing",
            "qa",
            vec!["command_exit_code"],
        );
        checkpoint.status = CheckpointStatus::Passed;
        let session = FeatureSession::new(
            "feat_todo_api",
            "Build TODO API",
            "goal_todo_api",
            "coding_team",
            "feat/todo-api",
            vec![checkpoint],
        );

        let closed = session.close().expect("all checkpoints passed");

        assert_eq!(closed.status, FeatureSessionStatus::Closed);
    }

    #[test]
    fn feature_session_rejects_closing_with_pending_checkpoint() {
        let checkpoint = Checkpoint::new(
            "tests_passing",
            "Tests passing",
            "qa",
            vec!["command_exit_code"],
        );
        let session = FeatureSession::new(
            "feat_todo_api",
            "Build TODO API",
            "goal_todo_api",
            "coding_team",
            "feat/todo-api",
            vec![checkpoint],
        );

        let error = session
            .close()
            .expect_err("pending checkpoint blocks close");

        assert_eq!(
            error,
            SessionTransitionError::CheckpointNotPassed {
                checkpoint_id: "tests_passing".to_owned(),
                status: CheckpointStatus::Pending,
            }
        );
    }

    #[test]
    fn feature_session_rejects_closing_for_each_unpassed_checkpoint_status() {
        for status in [
            CheckpointStatus::Pending,
            CheckpointStatus::Running,
            CheckpointStatus::Failed,
            CheckpointStatus::Blocked,
        ] {
            let mut checkpoint = Checkpoint::new(
                "tests_passing",
                "Tests passing",
                "qa",
                vec!["command_exit_code"],
            );
            checkpoint.status = status;
            let session = FeatureSession::new(
                "feat_todo_api",
                "Build TODO API",
                "goal_todo_api",
                "coding_team",
                "feat/todo-api",
                vec![checkpoint],
            );

            let error = session
                .close()
                .expect_err("unpassed checkpoint blocks close");

            assert_eq!(
                error,
                SessionTransitionError::CheckpointNotPassed {
                    checkpoint_id: "tests_passing".to_owned(),
                    status,
                }
            );
        }
    }

    #[test]
    fn design_session_requires_approval_before_execution() {
        let session = DesignSession::new("design_todo_api", "Design TODO API", "goal_todo_api");

        assert_eq!(session.status, DesignSessionStatus::Drafting);
        assert!(session.requires_approval);
    }

    #[test]
    fn goal_object_keeps_definition_and_scope() {
        let goal = GoalObject {
            id: "goal_todo_api".to_owned(),
            title: "Build TODO API".to_owned(),
            definition_of_done: vec!["Tests passing".to_owned()],
            constraints: vec!["Use Rust core".to_owned()],
            out_of_scope: vec!["Cloud sync".to_owned()],
        };

        assert_eq!(goal.definition_of_done, vec!["Tests passing"]);
        assert_eq!(goal.out_of_scope, vec!["Cloud sync"]);
    }
}
