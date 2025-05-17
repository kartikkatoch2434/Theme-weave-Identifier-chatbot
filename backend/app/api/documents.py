from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
import uuid
import os
import aiofiles
from ..core.config import settings
from ..services.document_processor import DocumentProcessor
from ..services.theme_identifier import ThemeIdentifier

router = APIRouter()
document_processor = DocumentProcessor()
theme_identifier = ThemeIdentifier()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document."""
    try:
        # Validate file size
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        
        # Create unique filename
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIRECTORY, unique_filename)
        
        # Save file
        os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
        
        # Process document
        doc_content = await document_processor.process_document(file_path)
        
        # Store in vector database
        doc_id = str(uuid.uuid4())
        await document_processor.store_document(doc_id, doc_content)
        
        return JSONResponse(
            content={
                "message": "Document processed successfully",
                "document_id": doc_id,
                "filename": file.filename,
                "pages": doc_content["pages"],
                "word_count": doc_content["word_count"],
                "confidence": doc_content["confidence"]
            },
            status_code=200
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def query_documents(query: str, n_results: int = 5):
    """Search documents based on a query."""
    try:
        results = await document_processor.search_documents(query, n_results)
        return JSONResponse(content=results, status_code=200)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/identify-themes")
async def identify_themes(document_ids: List[str]):
    """Identify themes across specified documents."""
    try:
        # Get documents from vector database
        documents = []
        for doc_id in document_ids:
            doc = await document_processor.search_documents(doc_id, n_results=1)
            if doc:
                documents.append(doc)
        
        if not documents:
            raise HTTPException(status_code=404, detail="No documents found")
        
        # Identify themes
        themes = await theme_identifier.identify_themes(documents)
        
        return JSONResponse(content=themes, status_code=200)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 