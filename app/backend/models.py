import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class StoryPhase(str, enum.Enum):
    INTAKE = "intake"
    KNOWLEDGE = "knowledge"
    DESIGN = "design"
    REVIEW = "review"
    XRAY = "xray"
    AUTO_PLAN = "auto_plan"
    CODEGEN = "codegen"
    EXECUTE = "execute"
    DONE = "done"


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text, default="")
    acceptance_criteria: Mapped[str] = mapped_column(Text, default="")
    definition_of_done: Mapped[str] = mapped_column(Text, default="")
    component: Mapped[str] = mapped_column(String(64), default="")
    priority: Mapped[str] = mapped_column(String(8), default="P2")
    phase: Mapped[str] = mapped_column(String(32), default=StoryPhase.INTAKE.value)
    knowledge_context: Mapped[str] = mapped_column(Text, default="")
    review_status: Mapped[str] = mapped_column(String(32), default=ReviewStatus.PENDING.value)
    review_notes: Mapped[str] = mapped_column(Text, default="")
    xray_published: Mapped[bool] = mapped_column(Boolean, default=False)
    automation_priority: Mapped[str] = mapped_column(String(32), default="")
    automation_pr_url: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    test_cases: Mapped[list["TestCase"]] = relationship(back_populates="story", cascade="all, delete-orphan")
    defects: Mapped[list["Defect"]] = relationship(back_populates="story", cascade="all, delete-orphan")
    agent_runs: Mapped[list["AgentRun"]] = relationship(back_populates="story", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    xray_key: Mapped[str] = mapped_column(String(32), default="")
    title: Mapped[str] = mapped_column(String(256))
    steps: Mapped[str] = mapped_column(Text, default="")
    expected_result: Mapped[str] = mapped_column(Text, default="")
    label: Mapped[str] = mapped_column(String(64))
    priority: Mapped[str] = mapped_column(String(8), default="P2")
    automation_candidate: Mapped[bool] = mapped_column(Boolean, default=False)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    story: Mapped["Story"] = relationship(back_populates="test_cases")


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    key: Mapped[str] = mapped_column(String(32), unique=True)
    title: Mapped[str] = mapped_column(String(256))
    severity: Mapped[str] = mapped_column(String(16), default="Medium")
    component: Mapped[str] = mapped_column(String(64), default="")
    labels: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(String(32), default="Open")
    linked_test: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    story: Mapped["Story"] = relationship(back_populates="defects")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    agent_name: Mapped[str] = mapped_column(String(64))
    phase: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="completed")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    story: Mapped["Story"] = relationship(back_populates="agent_runs")
