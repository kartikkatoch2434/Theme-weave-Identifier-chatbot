from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from ..services.theme_identifier import ThemeIdentifier
from pydantic import BaseModel
from ..services.document_processor import DocumentProcessor
import chromadb
from ..core.config import settings

router = APIRouter()

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)

doc_collection = chroma_client.get_or_create_collection("documents")
theme_collection = chroma_client.get_or_create_collection("themes")

theme_identifier = ThemeIdentifier(doc_collection, theme_collection)

class ThemeRequest(BaseModel):
    document_texts: List[str]
    document_ids: List[str]

@router.get("/analyze")
async def analyze_themes(timestamp: str):
    """Analyze and identify themes across provided documents. Accepts comma-separated timestamps."""
    try:
        # Support multiple timestamps (comma-separated)
        timestamps = [t.strip() for t in timestamp.split(",") if t.strip()]
        # Gather all documents for all timestamps
        all_document_texts = []
        all_document_ids = []
        for ts in timestamps:
            docs = theme_identifier.get_documents_by_timestamp(ts)
            all_document_texts.extend(docs["document_texts"])
            all_document_ids.extend(docs["document_ids"])
        # Run theme analysis on the combined set
        themes = await theme_identifier.identify_themes_for_documents(all_document_texts, all_document_ids, timestamps)
        return JSONResponse(
            content={
                "themes": themes["themes"],
                "model_used": themes["model"],
                "theme_count": len(themes["themes"])
            },
            status_code=200
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{theme_id}")
async def get_theme_summary(theme_id: str):
    theme = theme_collection.get(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return JSONResponse(
        content={
            "theme_uuuid": theme_id,
            'theme_data': theme['metadatas'][0]
        },
        status_code=200
    )


