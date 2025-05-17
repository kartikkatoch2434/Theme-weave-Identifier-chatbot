from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from ..services.theme_identifier import ThemeIdentifier
from pydantic import BaseModel

router = APIRouter()
theme_identifier = ThemeIdentifier()

class ThemeRequest(BaseModel):
    document_texts: List[str]
    document_ids: List[str]

@router.post("/analyze")
async def analyze_themes(request: ThemeRequest):
    """Analyze and identify themes across provided documents."""
    try:
        if len(request.document_texts) != len(request.document_ids):
            raise HTTPException(
                status_code=400,
                detail="Number of document texts must match number of document IDs"
            )
        
        documents = [
            {"text": text, "id": doc_id}
            for text, doc_id in zip(request.document_texts, request.document_ids)
        ]
        
        themes = await theme_identifier.identify_themes(documents)
        
        return JSONResponse(
            content={
                "themes": themes["themes"],
                "model_used": themes["model"],
                "document_count": len(documents)
            },
            status_code=200
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{theme_id}")
async def get_theme_summary(theme_id: str):
    """Get a detailed summary of a specific theme."""
    try:
        # This would typically fetch from a database
        # For now, return a mock response
        return JSONResponse(
            content={
                "theme_id": theme_id,
                "name": "Example Theme",
                "description": "Detailed theme description",
                "document_count": 5,
                "relevance_score": 0.85,
                "supporting_documents": [
                    {"id": "doc1", "relevance": 0.9},
                    {"id": "doc2", "relevance": 0.8}
                ]
            },
            status_code=200
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 