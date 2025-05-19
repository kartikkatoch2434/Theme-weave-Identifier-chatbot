from fastapi import APIRouter, Query
from ..services.query_processor import QueryProcessor
import chromadb
from ..core.config import settings

router = APIRouter()

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
doc_collection = chroma_client.get_or_create_collection("documents")

# Pass the existing collection from document_processor to QueryProcessor
query_processor = QueryProcessor(doc_collection)

@router.get("/query_documents")
async def query_documents(q: str = Query(...), timestamp: str = Query(None)):
    """
    Query each document individually and return answers with citation.
    Optionally filter by timestamp.
    """
    try:
        results = await query_processor.process_query(query=q, timestamp=timestamp)
        return {"query": q, "results": results}
    except Exception as e:
        return {"error": str(e)}
