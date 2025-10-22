"""
AI API Routes - Document Processing & AI Features
Add these routes to your API router
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from uuid import UUID
import tempfile
import os

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import User, Document, AIJob, AIJobStatus
from app.ai.document_parser import document_parser
from app.ai.client import ai_client
from sqlalchemy import select


# ============================================================================
# AI ROUTER
# ============================================================================

ai_router = APIRouter(prefix="/ai", tags=["AI Features"])


@ai_router.post("/parse-lease", response_model=Dict[str, Any])
async def parse_lease_document(
    file: UploadFile = File(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse a lease document and extract key terms using AI
    
    Upload a PDF or DOCX lease and get structured data back.
    """
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Create AI job record
        ai_job = AIJob(
            org_id=org_id,
            job_type="parse_lease",
            input_data={
                "filename": file.filename,
                "file_size": len(content),
            },
            status=AIJobStatus.PROCESSING,
        )
        db.add(ai_job)
        await db.commit()
        await db.refresh(ai_job)
        
        # Parse lease with AI
        result = await document_parser.parse_lease(tmp_path)
        
        # Update job with results
        ai_job.output_data = result
        ai_job.status = AIJobStatus.COMPLETED if not result.get("error") else AIJobStatus.FAILED
        ai_job.confidence_score = result.get("confidence_score", 0.0)
        ai_job.requires_human_review = result.get("confidence_score", 0.0) < 0.8
        ai_job.model_used = result.get("ai_model")
        ai_job.tokens_used = result.get("tokens_used")
        ai_job.cost = result.get("cost")
        
        if result.get("error"):
            ai_job.error_message = result["error"]
        
        await db.commit()
        await db.refresh(ai_job)
        
        # Return results
        return {
            "job_id": str(ai_job.id),
            "status": ai_job.status.value,
            "data": result,
            "requires_review": ai_job.requires_human_review,
        }
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@ai_router.post("/parse-pma", response_model=Dict[str, Any])
async def parse_property_management_agreement(
    file: UploadFile = File(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse a Property Management Agreement (PMA) and extract key business terms
    """
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        ai_job = AIJob(
            org_id=org_id,
            job_type="parse_pma",
            input_data={"filename": file.filename},
            status=AIJobStatus.PROCESSING,
        )
        db.add(ai_job)
        await db.commit()
        
        result = await document_parser.parse_property_management_agreement(tmp_path)
        
        ai_job.output_data = result
        ai_job.status = AIJobStatus.COMPLETED if not result.get("error") else AIJobStatus.FAILED
        ai_job.confidence_score = result.get("confidence_score", 0.0)
        
        await db.commit()
        
        return {
            "job_id": str(ai_job.id),
            "status": ai_job.status.value,
            "data": result,
        }
    
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@ai_router.post("/analyze-risks", response_model=Dict[str, Any])
async def analyze_document_risks(
    file: UploadFile = File(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a document for potential risks, unusual clauses, or red flags
    """
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc', '.txt')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, and TXT files are supported"
        )
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        ai_job = AIJob(
            org_id=org_id,
            job_type="analyze_risks",
            input_data={"filename": file.filename},
            status=AIJobStatus.PROCESSING,
        )
        db.add(ai_job)
        await db.commit()
        
        result = await document_parser.analyze_document_risks(tmp_path)
        
        ai_job.output_data = result
        ai_job.status = AIJobStatus.COMPLETED if not result.get("error") else AIJobStatus.FAILED
        
        await db.commit()
        
        return {
            "job_id": str(ai_job.id),
            "status": ai_job.status.value,
            "data": result,
        }
    
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@ai_router.post("/summarize", response_model=Dict[str, Any])
async def summarize_document(
    file: UploadFile = File(...),
    max_length: int = 500,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a concise summary of any document
    """
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc', '.txt')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, and TXT files are supported"
        )
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = await document_parser.summarize_document(tmp_path, max_length)
        
        return {
            "summary": result.get("summary"),
            "word_count": result.get("word_count"),
            "filename": file.filename,
        }
    
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@ai_router.post("/compare-documents", response_model=Dict[str, Any])
async def compare_two_documents(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    """
    Compare two documents and identify differences
    Useful for comparing lease versions or contract revisions
    """
    # Save both files temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file1.filename)[1]) as tmp1:
        tmp1.write(await file1.read())
        tmp1_path = tmp1.name
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file2.filename)[1]) as tmp2:
        tmp2.write(await file2.read())
        tmp2_path = tmp2.name
    
    try:
        result = await document_parser.compare_documents(tmp1_path, tmp2_path)
        
        return {
            "file1": file1.filename,
            "file2": file2.filename,
            "comparison": result,
        }
    
    finally:
        if os.path.exists(tmp1_path):
            os.unlink(tmp1_path)
        if os.path.exists(tmp2_path):
            os.unlink(tmp2_path)


@ai_router.get("/jobs", response_model=list)
async def list_ai_jobs(
    status: Optional[AIJobStatus] = None,
    job_type: Optional[str] = None,
    org_id: str = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    List all AI processing jobs for the organization
    """
    query = select(AIJob).where(
        AIJob.org_id == org_id
    ).order_by(AIJob.created_at.desc())
    
    if status:
        query = query.where(AIJob.status == status)
    
    if job_type:
        query = query.where(AIJob.job_type == job_type)
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    return [
        {
            "id": str(job.id),
            "job_type": job.job_type,
            "status": job.status.value,
            "confidence_score": job.confidence_score,
            "requires_human_review": job.requires_human_review,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
        for job in jobs
    ]


@ai_router.get("/jobs/{job_id}", response_model=Dict[str, Any])
async def get_ai_job(
    job_id: UUID,
    org_id: str = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific AI job
    """
    result = await db.execute(
        select(AIJob).where(
            AIJob.id == job_id,
            AIJob.org_id == org_id
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI job not found"
        )
    
    return {
        "id": str(job.id),
        "job_type": job.job_type,
        "status": job.status.value,
        "input_data": job.input_data,
        "output_data": job.output_data,
        "confidence_score": job.confidence_score,
        "requires_human_review": job.requires_human_review,
        "model_used": job.model_used,
        "tokens_used": job.tokens_used,
        "cost": float(job.cost) if job.cost else None,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@ai_router.post("/chat", response_model=Dict[str, Any])
async def ai_chat_completion(
    prompt: str,
    system: str = "",
    max_tokens: int = 1000,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    """
    General AI chat completion endpoint
    Use for AI copilots, assistants, or custom prompts
    """
    try:
        response = await ai_client.complete(
            prompt=prompt,
            system=system,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        
        return {
            "response": response["content"],
            "provider": response["provider"],
            "tokens_used": response["tokens_used"],
            "cost": response["cost"],
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI request failed: {str(e)}"
        )
