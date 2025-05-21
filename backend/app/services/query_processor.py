from typing import List, Dict, Any
import openai
import google.generativeai as genai
from groq import Groq
from ..core.config import settings
import chromadb
import logging
import re

logger = logging.getLogger(__name__)

class QueryProcessor:
    def __init__(self, doc_collection):
        self.doc_collection = doc_collection

        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY

        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)

        if settings.GROQ_API_KEY:
            self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

    async def process_query(self, query: str, timestamp: str) -> List[Dict[str, str]]:
        try:
            documents = self._get_documents_by_timestamp(timestamp)
            logger.info(f"Retrieved {len(documents)} documents for timestamp {timestamp}")
            
            if not documents:
                logger.warning(f"No documents found for timestamp {timestamp}")
                return []

            responses = []

            for doc in documents:
                context = self._prepare_prompt(query, doc["document"])
                try:
                    if settings.OPENAI_API_KEY:
                        answer = await self._query_openai(context)
                        model = "gpt-4"
                    elif settings.GOOGLE_API_KEY:
                        answer = await self._query_gemini(context)
                        model = "gemini-pro"
                    elif settings.GROQ_API_KEY:
                        answer = await self._query_groq(context)
                        model = "llama-3.3-70b-versatile"
                    else:
                        raise ValueError("No LLM API key configured")
                except Exception as e:
                    logger.error(f"Error processing document {doc['id']}: {str(e)}")
                    answer = f"Error: {str(e)}"
                    model = "None"

                # Extract citations from the answer
                citations = self._extract_citations(answer)
                
                responses.append({
                    "doc_id": doc["id"],
                    "response": answer,
                    "citations": citations,
                    "model": model
                })

            return responses
        except Exception as e:
            logger.error(f"Error in process_query: {str(e)}")
            raise

    def _get_documents_by_timestamp(self, timestamp: str) -> List[Dict[str, Any]]:
        try:
            logger.info(f"Fetching documents for timestamp: {timestamp}")
            # Log all available documents and their timestamps for debugging
            all_docs = self.doc_collection.get()
            if all_docs and all_docs["metadatas"]:
                logger.info("Available documents in ChromaDB:")
                for meta in all_docs["metadatas"]:
                    logger.info(f"Document ID: {meta.get('doc_id')}, Timestamp: {meta.get('timestamp')}")
                    # Log if this document matches our search timestamp
                    if meta.get('timestamp') == timestamp:
                        logger.info(f"✓ Found matching document: {meta.get('doc_id')}")
                    else:
                        logger.info(f"✗ No match for document: {meta.get('doc_id')}")
            
            results = self.doc_collection.get(
                where={"timestamp": timestamp},
                include=["documents", "metadatas"]
            )
            
            if not results["documents"]:
                logger.warning(f"No documents found in ChromaDB for timestamp {timestamp}")
                return []

            documents = [
                {"id": meta.get("doc_id"), "document": doc, "metadata": meta}
                for doc, meta in zip(results["documents"], results["metadatas"])
            ]
            
            logger.info(f"Retrieved {len(documents)} documents from ChromaDB")
            return documents
        except Exception as e:
            logger.error(f"Error fetching documents: {str(e)}")
            raise

    def _prepare_prompt(self, query: str, document_text: str) -> str:
        return (
            f"You are an assistant answering user questions based on a document.\n\n"
            f"Document:\n{document_text[:3000]}\n\n"
            f"User Question: {query}\n\n"
            "Please answer the question using only the information in the document. "
            "When citing information, follow these specific citation rules:\n\n"
            "1. For single citations, use format: (page X, para Y)\n"
            "2. For paragraph ranges, use format: (page X, para Y-Z)\n"
            "3. For multiple citations in the same sentence, use format: (page X, para Y; page X, para Z)\n"
            "4. For citations spanning multiple pages, use format: (page X, para Y; page Z, para W)\n"
            "5. Always use semicolons (;) to separate multiple citations, not 'and' or commas\n"
            "6. Include citations at the end of relevant sentences\n"
            "7. Be precise with paragraph numbers and ranges\n\n"
            "Example formats:\n"
            "- Single citation: (page 1, para 3)\n"
            "- Paragraph range: (page 1, para 3-5)\n"
            "- Multiple citations: (page 1, para 3; page 1, para 5)\n"
            "- Cross-page citations: (page 1, para 3; page 2, para 1)\n\n"
            "Please ensure all citations follow these exact formats."
        )

    async def _query_openai(self, prompt: str) -> str:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You answer document-based questions with accurate citations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )
        return response.choices[0].message.content.strip()

    async def _query_gemini(self, prompt: str) -> str:
        model = genai.GenerativeModel('gemini-pro')
        response = await model.generate_content_async(prompt)
        return response.text.strip()

    def _extract_citations(self, text: str) -> List[Dict[str, str]]:
        """Extract citations from text in various formats:
        - (page X, para Y)
        - (page X, para Y-Z)
        - (page X, para Y and page X, para Z)
        - (page X, para Y, page X, para Z)
        """
        citations = []
        
        # First, split the text by citation patterns to handle multiple citations
        citation_blocks = re.split(r'(\([^)]+\))', text)
        
        for block in citation_blocks:
            if not block.startswith('(') or not block.endswith(')'):
                continue
                
            # Remove the parentheses
            citation_text = block[1:-1]
            
            # Split by common conjunctions and commas
            citation_parts = re.split(r'\s+(?:and|,)\s+', citation_text)
            
            for part in citation_parts:
                # Match patterns like:
                # page X, para Y
                # page X, para Y-Z
                # page X
                citation_pattern = r'page\s+(\d+)(?:,\s*para\s+(\d+)(?:-(\d+))?)?'
                
                match = re.search(citation_pattern, part.strip())
                if match:
                    page = match.group(1)
                    paragraph_start = match.group(2)
                    paragraph_end = match.group(3)
                    
                    # Handle paragraph ranges
                    if paragraph_start:
                        if paragraph_end:
                            paragraph = f"{paragraph_start}-{paragraph_end}"
                        else:
                            paragraph = paragraph_start
                    else:
                        paragraph = "N/A"
                        
                    citations.append({
                        "page": page,
                        "paragraph": paragraph,
                        "full_citation": block  # Keep the original citation block for display
                    })
        
        return citations

    async def _query_groq(self, prompt: str) -> str:
        response = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You answer document-based questions with accurate citations. Always cite sources in the format (page X, para Y) where X is the page number and Y is the paragraph number."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()

    async def synthesize_combined_answer(self, user_query: str, doc_results: list) -> str:
        """
        Given the user query and a list of document-wise results, synthesize a single, comprehensive answer using the LLM.
        """
        if not doc_results or len(doc_results) == 0:
            return "No relevant information found in the uploaded documents."

        # Prepare a summary context
        context = "You are an expert assistant. Given the following document-specific answers, synthesize a single, comprehensive answer to the user's question.\n\n"
        context += f"User Question: {user_query}\n\n"
        context += "Document-wise Answers:\n"
        for idx, res in enumerate(doc_results, 1):
            doc_name = res.get('doc_id', f'Document {idx}')
            answer = res.get('response', '')
            context += f"- {doc_name}: {answer}\n"
        context += ("\nPlease provide a single, well-structured answer that combines the key points from all the above document-wise answers. Do not repeat the same information. Cite only if necessary.")

        # Use the same LLM as for document-wise answers
        if settings.OPENAI_API_KEY:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You synthesize research findings into a single, clear answer."},
                    {"role": "user", "content": context}
                ],
                temperature=0.3,
                max_tokens=800
            )
            return response.choices[0].message.content.strip()
        elif settings.GOOGLE_API_KEY:
            model = genai.GenerativeModel('gemini-pro')
            response = await model.generate_content_async(context)
            return response.text.strip()
        elif settings.GROQ_API_KEY:
            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You synthesize research findings into a single, clear answer."},
                    {"role": "user", "content": context}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        else:
            return "No LLM API key configured for synthesis."