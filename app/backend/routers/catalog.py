from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import Defect, TestCase
from .schemas import DefectOut, TestCaseOut

router = APIRouter(tags=["catalog"])


@router.get("/api/test-cases", response_model=list[TestCaseOut])
def list_all_test_cases(db: Session = Depends(get_db)):
    return db.query(TestCase).order_by(TestCase.id.desc()).all()


@router.get("/api/defects", response_model=list[DefectOut])
def list_all_defects(db: Session = Depends(get_db)):
    return db.query(Defect).order_by(Defect.id.desc()).all()
