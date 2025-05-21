from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import List
import uuid
import os
import aiofiles
from ..core.config import settings
from ..services.document_processor import DocumentProcessor
from datetime import datetime
import chromadb
import shutil

router = APIRouter()

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
doc_collection = chroma_client.get_or_create_collection("documents")
document_processor = DocumentProcessor(doc_collection)

def get_next_doc_id(counter_path: str) -> str:
    """Get next document ID (e.g., DOC001), scoped to a session (timestamped folder)."""
    if not os.path.exists(counter_path):
        with open(counter_path, "w") as f:
            f.write("2")  # Next will be DOC002
        return "DOC001"  # First one

    with open(counter_path, "r+") as f:
        current = int(f.read().strip())
        f.seek(0)
        f.write(str(current + 1))
        f.truncate()
    
    return f"DOC{current:03d}"



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
        
        # Generate timestamp folder
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        session_dir = os.path.join(settings.UPLOAD_DIRECTORY, timestamp)
        os.makedirs(session_dir, exist_ok=True)

        # Counter file path
        counter_file = os.path.join(session_dir, "doc_counter.txt")

        # Get doc ID like DOC001
        doc_id = get_next_doc_id(counter_file)

        # Determine file extension and build final file path
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{doc_id}{file_ext}"
        file_path = os.path.join(session_dir, unique_filename)            
        
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
        
        # Process document
        doc_content = document_processor.process_document(file_path)
        print(doc_content)

        # Store in vector database
        document_processor.store_document(doc_id, doc_content) 
        
        print("Document stored in vector database")
        
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

@router.post("/upload_multiple")
async def upload_multiple_documents(files: List[UploadFile] = File(...)):
    """Upload and process multiple documents at once."""
    try:
        # Generate timestamp folder once per batch
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        session_dir = os.path.join(settings.UPLOAD_DIRECTORY, timestamp)
        os.makedirs(session_dir, exist_ok=True)

        # Counter file path for this batch
        counter_file = os.path.join(session_dir, "doc_counter.txt")

        responses = []

        for file in files:
            content = await file.read()
            file_size = len(content)
            if file_size > settings.MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=413, detail=f"File too large: {file.filename}")

            # Get next DOC ID for this file in the batch
            doc_id = get_next_doc_id(counter_file)

            # Determine extension and file path
            file_ext = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{doc_id}{file_ext}"
            file_path = os.path.join(session_dir, unique_filename)

            # Save file
            async with aiofiles.open(file_path, 'wb') as out_file:
                await out_file.write(content)

            # Process document
            doc_content = document_processor.process_document(file_path)
            
            # Store in vector database
            document_processor.store_document(doc_id, doc_content, timestamp)

            # Append info to responses
            responses.append({
                "document_id": doc_id,
                "filename": file.filename,
                "timestamp": timestamp,
                "pages": doc_content["pages"],
                "word_count": doc_content["word_count"],
                "confidence": doc_content["confidence"]
            })

        return JSONResponse(
            content={
                "message": "Documents processed successfully",
                "timestamp_folder": timestamp,
                "documents": responses
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

@router.delete("/delete")
async def delete_document(doc_id: str = Query(...), timestamp: str = Query(...)):
    """
    Delete a document by its ID and timestamp from ChromaDB and the data folder.
    """
    try:
        # Remove from ChromaDB
        full_doc_id = f"{timestamp}_{doc_id}"
        doc_collection.delete(ids=[full_doc_id])

        # Remove file from data folder
        session_dir = os.path.join(settings.UPLOAD_DIRECTORY, timestamp)
        # Find the file with the doc_id prefix
        found = False
        for fname in os.listdir(session_dir):
            if fname.startswith(doc_id):
                file_path = os.path.join(session_dir, fname)
                os.remove(file_path)
                found = True
        if not found:
            raise HTTPException(status_code=404, detail="File not found in data folder")

        return {"message": f"Document {doc_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))