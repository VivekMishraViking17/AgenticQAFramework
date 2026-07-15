from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import agents
from .database import get_db
from .models import Story
from .schemas import ReviewAction, StoryCreate, StoryOut, StoryUpdate

router = APIRouter(prefix="/api/stories", tags=["stories"])


@router.get("", response_model=list[StoryOut])
def list_stories(db: Session = Depends(get_db)):
    return db.query(Story).order_by(Story.updated_at.desc()).all()


@router.get("/{story_id}", response_model=StoryOut)
def get_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found")
    return story


@router.post("", response_model=StoryOut, status_code=201)
def create_story(payload: StoryCreate, db: Session = Depends(get_db)):
    story = Story(
        key=agents._next_story_key(db),
        title=payload.title,
        description=payload.description,
        acceptance_criteria=payload.acceptance_criteria,
        definition_of_done=payload.definition_of_done,
        component=payload.component,
        priority=payload.priority,
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


@router.patch("/{story_id}", response_model=StoryOut)
def update_story(story_id: int, payload: StoryUpdate, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(story, k, v)
    db.commit()
    db.refresh(story)
    return story


@router.post("/{story_id}/advance", response_model=StoryOut)
def advance_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found")
    if story.phase == "done":
        raise HTTPException(400, "Story already completed")
    try:
        return agents.advance_phase(db, story)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{story_id}/review", response_model=StoryOut)
def review_story(story_id: int, payload: ReviewAction, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found")
    if story.phase != "review":
        raise HTTPException(400, "Story is not in review phase")
    return agents.submit_review(db, story, payload.approved, payload.notes)
