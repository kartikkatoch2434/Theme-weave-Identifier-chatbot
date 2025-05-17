import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import os
from typing import List, Dict, Any
import chromadb
from ..core.config import settings

class DocumentProcessor:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
        self.collection = self.chroma_client.get_or_create_collection("documents")
        
    async def process_document(self, file_path: str) -> Dict[str, Any]:
        """Process a document and extract its text content."""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            return await self._process_image(file_path)
        elif file_ext == '.pdf':
            return await self._process_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    async def _process_image(self, image_path: str) -> Dict[str, Any]:
        """Extract text from an image using OCR."""
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            
            # Get additional information
            info = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            return {
                "text": text,
                "pages": 1,
                "confidence": sum(info['conf']) / len(info['conf']) if info['conf'] else 0,
                "word_count": len(text.split())
            }
        except Exception as e:
            raise Exception(f"Error processing image: {str(e)}")
    
    async def _process_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Convert PDF to images and extract text using OCR."""
        try:
            pages = convert_from_path(pdf_path)
            full_text = []
            total_confidence = 0
            
            for page_num, page in enumerate(pages, 1):
                text = pytesseract.image_to_string(page)
                info = pytesseract.image_to_data(page, output_type=pytesseract.Output.DICT)
                
                full_text.append(text)
                total_confidence += sum(info['conf']) / len(info['conf']) if info['conf'] else 0
            
            return {
                "text": "\n\n".join(full_text),
                "pages": len(pages),
                "confidence": total_confidence / len(pages),
                "word_count": sum(len(text.split()) for text in full_text)
            }
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
    
    async def store_document(self, doc_id: str, content: Dict[str, Any]) -> None:
        """Store document in vector database."""
        self.collection.add(
            documents=[content["text"]],
            metadatas=[{
                "pages": content["pages"],
                "confidence": content["confidence"],
                "word_count": content["word_count"]
            }],
            ids=[doc_id]
        )
    
    async def search_documents(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant documents using vector similarity."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results 