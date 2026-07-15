import random
import re
import time
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .models import AgentRun, Defect, ReviewStatus, Story, StoryPhase, TestCase

PHASE_ORDER = [
    StoryPhase.INTAKE,
    StoryPhase.KNOWLEDGE,
    StoryPhase.DESIGN,
    StoryPhase.REVIEW,
    StoryPhase.XRAY,
    StoryPhase.AUTO_PLAN,
    StoryPhase.CODEGEN,
    StoryPhase.EXECUTE,
    StoryPhase.DONE,
]

PHASE_AGENTS = {
    StoryPhase.INTAKE: "Story Context Agent",
    StoryPhase.KNOWLEDGE: "Knowledge Agent",
    StoryPhase.DESIGN: "Test Design Agent",
    StoryPhase.REVIEW: "Review Orchestrator",
    StoryPhase.XRAY: "XRay Sync Agent",
    StoryPhase.AUTO_PLAN: "Automation Scout",
    StoryPhase.CODEGEN: "Codegen Agent",
    StoryPhase.EXECUTE: "Execution + Triage Agent",
}

TC_TEMPLATES = [
    ("functional", "Verify happy path for: {ac}", "Execute primary flow per AC", "Expected behavior matches AC"),
    ("edge-case", "Boundary validation: {ac}", "Test empty, max, and invalid inputs", "Appropriate validation errors shown"),
    ("security", "Auth boundary check: {component}", "Attempt unauthorized access to resource", "403/401 returned, no data leak"),
    ("data-centric", "Data integrity: {component}", "CRUD operations with valid/invalid data", "Data persisted and validated correctly"),
    ("non-functional", "Response time: {component}", "Load endpoint under normal conditions", "p95 latency within SLA"),
    ("uat", "Business acceptance: {title}", "Complete end-to-end business scenario", "Business stakeholder criteria met"),
    ("api-contract", "API contract: {component}", "Verify schema, status codes, versioning", "Contract matches OpenAPI spec"),
    ("regression", "Regression guard: {key}", "Re-run prior defect scenario", "Prior bug does not reproduce"),
]


def _next_story_key(db: Session) -> str:
    count = db.query(Story).count()
    return f"QE-{1001 + count}"


def _log_agent(db: Session, story: Story, phase: StoryPhase, summary: str) -> AgentRun:
    run = AgentRun(
        story_id=story.id,
        agent_name=PHASE_AGENTS.get(phase, "Agent"),
        phase=phase.value,
        output_summary=summary,
        duration_ms=random.randint(800, 4500),
    )
    db.add(run)
    return run


def _parse_ac_lines(ac_text: str) -> list[str]:
    lines = [ln.strip() for ln in ac_text.splitlines() if ln.strip()]
    cleaned = []
    for ln in lines:
        ln = re.sub(r"^[-*•\d.)]+\s*", "", ln)
        if ln:
            cleaned.append(ln)
    return cleaned or ["Core feature works as specified"]


def run_intake(db: Session, story: Story) -> str:
    ac_count = len(_parse_ac_lines(story.acceptance_criteria))
    return f"Parsed story {story.key}: {ac_count} acceptance criteria, DOD validated, component={story.component or 'unassigned'}"


def run_knowledge(db: Session, story: Story) -> str:
    refs = [
        f"Confluence: /wiki/spaces/PRD/pages/{random.randint(10000, 99999)}",
        f"PRD: {story.component or 'platform'}-requirements-v2.pdf",
        f"Related bugs: {random.randint(1, 4)} customer defects in last 90d",
    ]
    story.knowledge_context = "\n".join(refs)
    return f"Retrieved {len(refs)} knowledge sources for RAG context bundle"


def run_design(db: Session, story: Story) -> str:
    db.query(TestCase).filter(TestCase.story_id == story.id).delete()
    ac_lines = _parse_ac_lines(story.acceptance_criteria)
    created = 0
    for i, (label, title_t, steps_t, exp_t) in enumerate(TC_TEMPLATES):
        ac = ac_lines[i % len(ac_lines)]
        fmt = {
            "ac": ac,
            "component": story.component or "service",
            "title": story.title,
            "key": story.key,
        }
        tc = TestCase(
            story_id=story.id,
            title=title_t.format(**fmt),
            steps=steps_t.format(**fmt),
            expected_result=exp_t,
            label=label,
            priority="P1" if label in ("functional", "security") else story.priority,
            automation_candidate=label in ("functional", "api-contract", "regression"),
        )
        db.add(tc)
        created += 1
    story.review_status = ReviewStatus.PENDING.value
    return f"Generated {created} labeled test cases across 8 quality dimensions"


def run_review_orchestrator(db: Session, story: Story) -> str:
    tcs = db.query(TestCase).filter(TestCase.story_id == story.id).all()
    labels = {tc.label for tc in tcs}
    gaps = []
    if "security" not in labels:
        gaps.append("security")
    if "edge-case" not in labels:
        gaps.append("edge-case")
    ac_count = len(_parse_ac_lines(story.acceptance_criteria))
    coverage = min(100, int((len(tcs) / max(ac_count, 1)) * 25))
    return f"Coverage matrix: {coverage}% AC mapped, labels={sorted(labels)}, gaps={gaps or 'none'}"


def run_xray(db: Session, story: Story) -> str:
    tcs = db.query(TestCase).filter(TestCase.story_id == story.id, TestCase.approved == True).all()
    for i, tc in enumerate(tcs, start=1):
        tc.xray_key = f"XRAY-{story.key}-{i:03d}"
    story.xray_published = True
    return f"Published {len(tcs)} tests to XRay, linked to Jira {story.key}"


def run_auto_plan(db: Session, story: Story) -> str:
    tcs = db.query(TestCase).filter(TestCase.story_id == story.id, TestCase.approved == True).all()
    candidates = [tc for tc in tcs if tc.automation_candidate]
    story.automation_priority = f"P1/P2: {len(candidates)} candidates"
    return f"Identified {len(candidates)} automation candidates from XRay suite"


def run_codegen(db: Session, story: Story) -> str:
    story.automation_pr_url = f"https://github.com/vikingcloud/qe-auto/pull/{random.randint(100, 999)}"
    return f"Codegen Agent created Playwright PR: {story.automation_pr_url}"


def run_execute(db: Session, story: Story) -> str:
    existing = db.query(Defect).filter(Defect.story_id == story.id).count()
    if existing == 0:
        tcs = db.query(TestCase).filter(TestCase.story_id == story.id).limit(1).all()
        link = tcs[0].xray_key if tcs else ""
        defect = Defect(
            story_id=story.id,
            key=f"BUG-{story.key}-1",
            title=f"Product defect found during automation: {story.title[:60]}",
            severity="Medium",
            component=story.component or "unknown",
            labels="auto-filed,qe-agent,found-in-automation",
            linked_test=link,
        )
        db.add(defect)
        return f"CI execution complete. 1 product defect filed to Jira ({defect.key})"
    return "CI execution complete. All automated tests passed"


PHASE_RUNNERS = {
    StoryPhase.INTAKE: run_intake,
    StoryPhase.KNOWLEDGE: run_knowledge,
    StoryPhase.DESIGN: run_design,
    StoryPhase.REVIEW: run_review_orchestrator,
    StoryPhase.XRAY: run_xray,
    StoryPhase.AUTO_PLAN: run_auto_plan,
    StoryPhase.CODEGEN: run_codegen,
    StoryPhase.EXECUTE: run_execute,
}


def advance_phase(db: Session, story: Story) -> Story:
    current = StoryPhase(story.phase)
    if current == StoryPhase.REVIEW:
        if story.review_status != ReviewStatus.APPROVED.value:
            raise ValueError("QA SME approval required before advancing from review")
    if current == StoryPhase.XRAY:
        approved = db.query(TestCase).filter(TestCase.story_id == story.id, TestCase.approved == True).count()
        if approved == 0:
            raise ValueError("No approved test cases for XRay publish")

    runner = PHASE_RUNNERS.get(current)
    if runner:
        summary = runner(db, story)
        _log_agent(db, story, current, summary)

    idx = PHASE_ORDER.index(current)
    if idx < len(PHASE_ORDER) - 1:
        story.phase = PHASE_ORDER[idx + 1].value
    story.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(story)
    return story


def submit_review(db: Session, story: Story, approved: bool, notes: str) -> Story:
    story.review_status = ReviewStatus.APPROVED.value if approved else ReviewStatus.REJECTED.value
    story.review_notes = notes
    if approved:
        tcs = db.query(TestCase).filter(TestCase.story_id == story.id).all()
        for tc in tcs:
            tc.approved = True
        _log_agent(db, story, StoryPhase.REVIEW, f"QA SME approved {len(tcs)} test cases")
    else:
        story.phase = StoryPhase.DESIGN.value
        _log_agent(db, story, StoryPhase.REVIEW, f"QA SME rejected: {notes or 'rework required'}")
    db.commit()
    db.refresh(story)
    return story
