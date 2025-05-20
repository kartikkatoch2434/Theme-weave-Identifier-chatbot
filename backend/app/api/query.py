from fastapi import APIRouter, Query
from ..services.query_processor import QueryProcessor
import chromadb
from ..core.config import settings
from typing import List
import logging

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
doc_collection = chroma_client.get_or_create_collection("documents")

# Pass the existing collection from document_processor to QueryProcessor
query_processor = QueryProcessor(doc_collection)

@router.get("/query_documents")
async def query_documents(q: str = Query(...), timestamp: str = Query(None)):
    """
    Query each document individually and return answers with citation.
    Optionally filter by multiple timestamps (comma-separated).
    """
    try:
        # Parse timestamps if provided
        timestamps = timestamp.split(',') if timestamp else None
        logger.info(f"Processing query: {q} with timestamps: {timestamps}")
        
        # Get results for each timestamp
        all_results = []
        for ts in timestamps:
            logger.info(f"Querying documents for timestamp: {ts}")
            results = await query_processor.process_query(query=q, timestamp=ts)
            logger.info(f"Found {len(results)} results for timestamp {ts}")
            all_results.extend(results)
            
        logger.info(f"Total results found: {len(all_results)}")
        return {"query": q, "results": all_results}
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return {"error": str(e)}
