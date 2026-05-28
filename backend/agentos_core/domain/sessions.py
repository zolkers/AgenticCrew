from typing import Literal

from pydantic import BaseModel, ConfigDict

CheckpointStatus = Literal["pending", "running", "passed", "failed", "blocked"]
DesignSessionStatus = Literal["drafting", "reviewing", "approved"]
FeatureSessionStatus = Literal[
    "draft",
    "opened",
    "planning",
    "running",
    "blocked",
    "validating",
    "closing",
    "closed",
    "archived",
]


class GoalObject(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    definition_of_done: tuple[str, ...]
    constraints: tuple[str, ...]
    out_of_scope: tuple[str, ...]


class Checkpoint(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    label: str
    owner_agent: str
    required_evidence: tuple[str, ...]
    status: CheckpointStatus = "pending"


class DesignSession(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    goal_object_id: str
    status: DesignSessionStatus = "drafting"
    requires_approval: bool = True


class FeatureSession(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    goal_object_id: str
    team_id: str
    branch: str
    checkpoints: tuple[Checkpoint, ...]
    status: FeatureSessionStatus = "draft"
