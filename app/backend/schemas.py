from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StoryCreate(BaseModel):
    title: str
    description: str = ""
    acceptance_criteria: str = ""
    definition_of_done: str = ""
    component: str = ""
    priority: str = "P2"


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    definition_of_done: Optional[str] = None
    component: Optional[str] = None
    priority: Optional[str] = None


class TestCaseOut(BaseModel):
    id: int
    story_id: int
    xray_key: str
    title: str
    steps: str
    expected_result: str
    label: str
    priority: str
    automation_candidate: bool
    approved: bool

    model_config = {"from_attributes": True}


class DefectOut(BaseModel):
    id: int
    story_id: int
    key: str
    title: str
    severity: str
    component: str
    labels: str
    status: str
    linked_test: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentRunOut(BaseModel):
    id: int
    story_id: int
    agent_name: str
    phase: str
    status: str
    output_summary: str
    duration_ms: int
    created_at: datetime

    model_config = {"from_attributes": True}


class StoryOut(BaseModel):
    id: int
    key: str
    title: str
    description: str
    acceptance_criteria: str
    definition_of_done: str
    component: str
    priority: str
    phase: str
    knowledge_context: str
    review_status: str
    review_notes: str
    xray_published: bool
    automation_priority: str
    automation_pr_url: str
    created_at: datetime
    updated_at: datetime
    test_cases: list[TestCaseOut] = []
    defects: list[DefectOut] = []
    agent_runs: list[AgentRunOut] = []

    model_config = {"from_attributes": True}


class ReviewAction(BaseModel):
    approved: bool
    notes: str = ""


class DashboardStats(BaseModel):
    total_stories: int
    by_phase: dict[str, int]
    total_test_cases: int
    approved_test_cases: int
    pending_reviews: int
    xray_published: int
    automation_candidates: int
    open_defects: int
    agent_runs_today: int
    projected_roi_pct: float
    tc_time_saved_pct: float
    traceability_pct: float
