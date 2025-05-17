from typing import List, Dict, Any
import openai
import google.generativeai as genai
from ..core.config import settings

class ThemeIdentifier:
    def __init__(self):
        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
        
        # Initialize Google AI client
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
    
    async def identify_themes(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Identify common themes across multiple documents using LLM."""
        # Prepare the prompt
        context = self._prepare_context(documents)
        
        try:
            if settings.OPENAI_API_KEY:
                return await self._identify_themes_openai(context)
            elif settings.GOOGLE_API_KEY:
                return await self._identify_themes_gemini(context)
            else:
                raise ValueError("No LLM API key configured")
        except Exception as e:
            raise Exception(f"Error identifying themes: {str(e)}")
    
    def _prepare_context(self, documents: List[Dict[str, Any]]) -> str:
        """Prepare context from documents for LLM processing."""
        context = "Analyze the following document excerpts and identify common themes:\n\n"
        
        for i, doc in enumerate(documents, 1):
            context += f"Document {i}:\n{doc['text'][:1000]}...\n\n"
        
        context += "\nIdentify and explain the main themes present across these documents. For each theme:\n"
        context += "1. Provide a clear theme name\n"
        context += "2. Explain the theme\n"
        context += "3. List supporting evidence from specific documents\n"
        
        return context
    
    async def _identify_themes_openai(self, context: str) -> Dict[str, Any]:
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
            "themes": self._parse_themes(response.choices[0].message.content),
            "model": "gpt-4"
        }
    
    async def _identify_themes_gemini(self, context: str) -> Dict[str, Any]:
        """Use Google's Gemini to identify themes."""
        model = genai.GenerativeModel('gemini-pro')
        response = await model.generate_content(context)
        
        return {
            "themes": self._parse_themes(response.text),
            "model": "gemini-pro"
        }
    
    def _parse_themes(self, response: str) -> List[Dict[str, Any]]:
        """Parse the LLM response into structured theme data."""
        # This is a simple implementation - you might want to make it more robust
        themes = []
        current_theme = {}
        
        for line in response.split('\n'):
            line = line.strip()
            if line.startswith('Theme:') or line.startswith('Theme '):
                if current_theme:
                    themes.append(current_theme)
                current_theme = {'name': line.split(':', 1)[1].strip()}
            elif line.startswith('Evidence:') or line.startswith('Supporting evidence:'):
                current_theme['evidence'] = []
            elif current_theme.get('evidence') is not None and line:
                current_theme['evidence'].append(line)
            elif line and not current_theme.get('description'):
                current_theme['description'] = line
        
        if current_theme:
            themes.append(current_theme)
        
        return themes 