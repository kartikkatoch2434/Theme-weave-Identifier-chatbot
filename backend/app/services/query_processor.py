from typing import List, Dict, Any
import openai
import google.generativeai as genai
from groq import Groq
from ..core.config import settings
import chromadb

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
        documents = self._get_documents_by_timestamp(timestamp)
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
                answer = f"Error: {str(e)}"
                model = "None"

            responses.append({
                "doc_id": doc["id"],
                "response": answer,
                "citation": doc["metadata"].get("pages", "N/A"),
                "model": model
            })

        return responses

    def _get_documents_by_timestamp(self, timestamp: str) -> List[Dict[str, Any]]:
        
        results = self.doc_collection.get(
            where={"timestamp": timestamp},
            include=["documents", "metadatas"]  # remove "doc_id"
        )

        return [
            {"id": meta.get("doc_id"), "document": doc, "metadata": meta}
            for doc, meta in zip(results["documents"], results["metadatas"])
        ]

    def _prepare_prompt(self, query: str, document_text: str) -> str:
        return (
            f"You are an assistant answering user questions based on a document.\n\n"
            f"Document:\n{document_text[:3000]}\n\n"
            f"User Question: {query}\n\n"
            "Please answer the question using only the information in the document. "
            "Include a brief citation (e.g., 'page 2, para 3') where applicable."
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

    async def _query_groq(self, prompt: str) -> str:
        response = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You answer document-based questions with accurate citations."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()
