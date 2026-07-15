from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import get_db
from .models import AgentRun, Defect, ReviewStatus, Story, TestCase
from .schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    stories = db.query(Story).all()
    by_phase: dict[str, int] = {}
    for s in stories:
        by_phase[s.phase] = by_phase.get(s.phase, 0) + 1

    total_tc = db.query(TestCase).count()
    approved_tc = db.query(TestCase).filter(TestCase.approved == True).count()
    pending = db.query(Story).filter(
        Story.phase == "review", Story.review_status == ReviewStatus.PENDING.value
    ).count()
    xray_pub = db.query(Story).filter(Story.xray_published == True).count()
    auto_cand = db.query(TestCase).filter(TestCase.automation_candidate == True).count()
    open_defects = db.query(Defect).filter(Defect.status == "Open").count()

    today = datetime.utcnow() - timedelta(hours=24)
    runs_today = db.query(AgentRun).filter(AgentRun.created_at >= today).count()

    published = xray_pub
    total_stories = len(stories) or 1
    traceability = round((published / total_stories) * 100, 1) if stories else 0

    return DashboardStats(
        total_stories=len(stories),
        by_phase=by_phase,
        total_test_cases=total_tc,
        approved_test_cases=approved_tc,
        pending_reviews=pending,
        xray_published=xray_pub,
        automation_candidates=auto_cand,
        open_defects=open_defects,
        agent_runs_today=runs_today,
        projected_roi_pct=4.8,
        tc_time_saved_pct=75.0,
        traceability_pct=traceability,
    )
