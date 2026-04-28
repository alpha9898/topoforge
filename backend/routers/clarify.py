from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import Answer, ClarificationQuestion, Topology
from services.clarification_engine import apply_answers, build_questions
from services.project_store import get_project

router = APIRouter(tags=["clarifications"])


class QuestionsResponse(BaseModel):
    questions: list[ClarificationQuestion]


class AnswersRequest(BaseModel):
    answers: list[Answer]


@router.get("/projects/{project_id}/clarifications", response_model=QuestionsResponse)
def get_clarifications(project_id: str) -> QuestionsResponse:
    project = get_project(project_id)
    if not project or not project.topology:
        raise HTTPException(status_code=404, detail="Parsed project not found.")
    project.questions = build_questions(project.topology)
    return QuestionsResponse(questions=project.questions)


@router.post("/projects/{project_id}/clarifications", response_model=Topology)
def submit_clarifications(project_id: str, request: AnswersRequest) -> Topology:
    project = get_project(project_id)
    if not project or not project.topology:
        raise HTTPException(status_code=404, detail="Parsed project not found.")
    project.topology = apply_answers(project.topology, request.answers)
    project.questions = build_questions(project.topology)
    return project.topology
