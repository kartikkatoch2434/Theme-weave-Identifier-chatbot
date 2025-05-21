from typing import List, Dict, Any
import openai
import google.generativeai as genai
from ..core.config import settings
from groq import Groq
import re

class ThemeIdentifier:
    def __init__(self, doc_collection, theme_collection):
        self.doc_collection = doc_collection
        self.theme_collection = theme_collection

        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
        
        # Initialize Google AI client
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)

        # Initialize GROQ AI client
        if settings.GROQ_API_KEY:
            self.client = Groq(api_key=settings.GROQ_API_KEY)

    def get_documents_by_timestamp(self, timestamp: str) -> Dict[str, list]:
        try:
            results = self.doc_collection.get(
                where={"timestamp": timestamp},
                include=["documents", "metadatas"]
            )

            if not results["documents"]:
                raise HTTPException(status_code=404, detail="No documents found for the given timestamp")

            document_texts = results["documents"]
            document_ids = [
                meta.get("document_id", f"DOC{idx+1:03}")
                for idx, meta in enumerate(results["metadatas"])
            ]

            return {
                "document_texts": document_texts,
                "document_ids": document_ids
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")


    async def identify_themes(self, timestamp: str) -> Dict[str, Any]:
        """Identify common themes across multiple documents using LLM."""
        
        documents_raw = self.get_documents_by_timestamp(timestamp)

        documents = [
            {"text": text, "id": doc_id}
            for text, doc_id in zip(documents_raw["document_texts"], documents_raw["document_ids"])
        ]

        # Prepare the prompt
        context = self._prepare_context(documents)
        
        try:
            if settings.OPENAI_API_KEY:
                return await self._identify_themes_openai(context, timestamp)
            elif settings.GOOGLE_API_KEY:
                return await self._identify_themes_gemini(context, timestamp)
            elif settings.GROQ_API_KEY:
                return await self._identify_themes_groq(context, timestamp)
            else:
                raise ValueError("No LLM API key configured")
        except Exception as e:
            raise Exception(f"Error identifying themes: {str(e)}")
    
    def _prepare_context(self, documents: List[Dict[str, Any]]) -> str:
        """Prepare context from documents for LLM processing."""
        context = "Analyze the following document excerpts and identify common themes:\n\n"
        
        for i, doc in enumerate(documents, 1):
            context += f"Document {i}:\n{doc['text'][:1000]}...\n\n"
        
        context += (
            "Identify and explain the main themes present across these documents. For each theme:\n"
            "1. Provide a clear theme name\n"
            "2. Explain the theme\n"
            "3. List supporting evidence from specific documents\n\n"
            "Please return the analysis in the following format exactly:\n\n"
            "Theme: <Theme Name>\n"
            "<Brief description of the theme>\n"
            "Evidence:\n"
            "- Document X: <evidence line 1>\n"
            "- Document Y: <evidence line 2>\n\n"
            "Theme: <Next Theme Name>\n"
            "<Brief description of the next theme>\n"
            "Supporting evidence:\n"
            "- Document X: <evidence line 1>\n"
            "- Document Z: <evidence line 2>\n\n"
            "(Continue this structure for all identified themes. Do not number the themes.)"
        )
        
        return context
        
    async def _identify_themes_openai(self, context: str, timestamp: str) -> Dict[str, Any]:
        """Use OpenAI to identify themes."""
        response = await openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a theme identification expert. Analyze documents and identify common themes with supporting evidence."},
                {"role": "user", "content": context}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        return {
            "themes": self._parse_themes(response.choices[0].message.content, timestamp),
            "model": "gpt-4"
        }

    async def _identify_themes_groq(self, context: str, timestamp: str) -> Dict[str, Any]:

        """Use Groq-llama-3.3-70b-versatile to identify themes."""
        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a theme identification expert. Analyze documents and identify common themes with supporting evidence."},
                {"role": "user", "content": context}
            
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            )
        
        return {
            "themes": self._parse_themes(response.choices[0].message.content, timestamp),
            "model": "llama-3.3-70b-versatile"
        }
    
    async def _identify_themes_gemini(self, context: str, timestamp: str) -> Dict[str, Any]:
        """Use Google's Gemini to identify themes."""
        model = genai.GenerativeModel('gemini-pro')
        response = await model.generate_content(context)
        
        return {
            "themes": self._parse_themes(response.text, timestamp),
            "model": "gemini-pro"
        }
    
    def _parse_themes(self, response: str, timestamp: str) -> List[Dict[str, Any]]:
        """Parse the LLM response into structured theme data and store them in ChromaDB."""
        themes = []
        current_theme = {}
        theme_counter = 1

        for line in response.split('\n'):
            line = line.strip()
            if line.startswith('Theme:') or line.startswith('Theme '):
                if current_theme:
                    theme_id = f"{timestamp}_theme_{theme_counter}"
                    current_theme['theme_id'] = theme_id
                    # Extract documents from evidence
                    current_theme['documents'] = self._extract_documents_from_evidence(current_theme.get('evidence', []))
                    themes.append(current_theme)

                    # Store theme in ChromaDB
                    self.theme_collection.add(
                        ids=[theme_id],
                        documents=[current_theme.get("description", "")],
                        metadatas=[{
                            "name": current_theme.get("name", ""),
                            "timestamp": timestamp,
                            "evidence": "\n".join(current_theme.get("evidence", []))  # Convert list to string
                        }]
                    )
                    theme_counter += 1

                current_theme = {'name': line.split(':', 1)[1].strip()}

            elif line.startswith('Evidence:') or line.startswith('Supporting evidence:'):
                current_theme['evidence'] = []

            elif current_theme.get('evidence') is not None and line:
                current_theme['evidence'].append(line)

            elif line and not current_theme.get('description'):
                current_theme['description'] = line

        # Final theme insert
        if current_theme:
            theme_id = f"{timestamp}_theme_{theme_counter}"
            current_theme['theme_id'] = theme_id
            current_theme['documents'] = self._extract_documents_from_evidence(current_theme.get('evidence', []))
            themes.append(current_theme)

            self.theme_collection.add(
                ids=[theme_id],
                documents=[current_theme.get("description", "")],
                metadatas=[{
                    "name": current_theme.get("name", ""),
                    "timestamp": timestamp,
                    "evidence": "\n".join(current_theme.get("evidence", []))  # Convert list to string
                }]
            )

        print("Themes_processor:", themes)
        return themes

    def _extract_documents_from_evidence(self, evidence_list):
        doc_ids = set()
        for evidence in evidence_list:
            # Try to match both "Document X:" and "document_kar001.pdf:"
            match = re.match(r'-\s*(Document\s+\d+|[\w\-.]+):', evidence, re.IGNORECASE)
            if match:
                doc_ids.add(match.group(1).strip())
        return list(doc_ids)

    async def identify_themes_for_documents(self, document_texts: list, document_ids: list, timestamps: list) -> dict:
        """Identify themes across a provided set of documents (multi-timestamp support)."""
        documents = [
            {"text": text, "id": doc_id}
            for text, doc_id in zip(document_texts, document_ids)
        ]
        context = self._prepare_context(documents)
        try:
            if settings.OPENAI_API_KEY:
                return await self._identify_themes_openai(context, ','.join(timestamps))
            elif settings.GOOGLE_API_KEY:
                return await self._identify_themes_gemini(context, ','.join(timestamps))
            elif settings.GROQ_API_KEY:
                return await self._identify_themes_groq(context, ','.join(timestamps))
            else:
                raise ValueError("No LLM API key configured")
        except Exception as e:
            raise Exception(f"Error identifying themes: {str(e)}")
