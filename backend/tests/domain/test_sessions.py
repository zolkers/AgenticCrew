import pytest
from pydantic import ValidationError

from agentos_core.domain.sessions import Checkpoint, DesignSession, FeatureSession, GoalObject


def test_goal_object_is_immutable() -> None:
    goal = GoalObject(
        id="goal_todo_api",
        title="Build TODO API",
        definition_of_done=("Tests passing",),
        constraints=("Use FastAPI",),
        out_of_scope=("Authentication",),
    )

    with pytest.raises(ValidationError):
        goal.title = "Changed"  # type: ignore[misc]


def test_feature_session_tracks_goal_team_branch_and_checkpoints() -> None:
    checkpoint = Checkpoint(
        id="tests_passing",
        label="Tests passing",
        owner_agent="qa",
        required_evidence=("command_exit_code",),
    )

    session = FeatureSession(
        id="feat_todo_api",
        title="Build TODO API",
        goal_object_id="goal_todo_api",
        team_id="coding_team",
        branch="feat/todo-api",
        checkpoints=(checkpoint,),
    )

    assert session.status == "draft"
    assert session.checkpoints[0].status == "pending"


def test_design_session_requires_human_approval_before_execution() -> None:
    session = DesignSession(
        id="design_todo_api",
        title="Design TODO API",
        goal_object_id="goal_todo_api",
    )

    assert session.status == "drafting"
    assert session.requires_approval is True
