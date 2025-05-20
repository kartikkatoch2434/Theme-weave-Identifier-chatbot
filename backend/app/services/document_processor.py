import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import os
from typing import List, Dict, Any

from paddleocr import PaddleOCR
import tempfile

from paddleocr import PaddleOCR
import numpy as np


# Initialize once (consider placing this outside class)
# ocr_model = PaddleOCR(use_angle_cls=True, lang='en')


# class DocumentProcessor:
        
    # async def process_document(self, file_path: str) -> Dict[str, Any]:
    #     """Process a document and extract its text content."""
    #     file_ext = os.path.splitext(file_path)[1].lower()
        
    #     if file_ext in ['.jpg', '.jpeg', '.png', '.bmp']:
    #         return await self._process_image(file_path)
    #     elif file_ext == '.pdf':
    #         return await self._process_pdf(file_path)
    #     else:
    #         raise ValueError(f"Unsupported file type: {file_ext}")
    
    # async def _process_image(self, image_path: str) -> Dict[str, Any]:
    #     """Extract text from an image using OCR."""
    #     try:
    #         image = Image.open(image_path)
    #         text = pytesseract.image_to_string(image)
            
    #         # Get additional information
    #         info = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
    #         return {
    #             "text": text,
    #             "pages": 1,
    #             "confidence": sum(info['conf']) / len(info['conf']) if info['conf'] else 0,
    #             "word_count": len(text.split())
    #         }
    #     except Exception as e:
    #         raise Exception(f"Error processing image: {str(e)}")
    
    # async def _process_pdf(self, pdf_path: str) -> Dict[str, Any]:
    #     """Convert PDF to images and extract text using OCR."""
    #     try:
    #         pages = convert_from_path(pdf_path)
    #         full_text = []
    #         total_confidence = 0
            
    #         for page_num, page in enumerate(pages, 1):
    #             text = pytesseract.image_to_string(page)
    #             info = pytesseract.image_to_data(page, output_type=pytesseract.Output.DICT)
                
    #             full_text.append(text)
    #             total_confidence += sum(info['conf']) / len(info['conf']) if info['conf'] else 0
            
    #         return {
    #             "text": "\n\n".join(full_text),
    #             "pages": len(pages),
    #             "confidence": total_confidence / len(pages),
    #             "word_count": sum(len(text.split()) for text in full_text)
    #         }
    #     except Exception as e:
    #         raise Exception(f"Error processing PDF: {str(e)}")
    





ocr_model = PaddleOCR(use_angle_cls=True, lang='en')

class DocumentProcessor:

    def __init__(self, collection):
        self.collection = collection

    def process_document(self, file_path: str) -> Dict[str, Any]:
        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            return self._process_image(file_path)
        elif file_ext == '.pdf':
            return self._process_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

    def _process_image(self, image_path: str) -> Dict[str, Any]:
        result = ocr_model.ocr(image_path, cls=True)

        if not result or not result[0]:
            return {"text": "", "pages": 1, "confidence": 0.0, "word_count": 0}

        text_lines, confidences = [], []
        for line in result[0]:
            text, conf = line[1][0], line[1][1]
            text_lines.append(text)
            confidences.append(conf)

        combined_text = " ".join(text_lines)
        avg_conf = sum(confidences) / len(confidences)

        return {
            "text": combined_text,
            "pages": 1,
            "confidence": avg_conf,
            "word_count": len(combined_text.split())
        }
        
    def _process_pdf(self, pdf_path: str) -> dict:
        """Try direct text extraction first; fallback to OCR on images if text too short."""
        import fitz  # PyMuPDF
        
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()

        if len(full_text.strip()) >= 20:
            # Return text-based PDF data
            word_count = len(full_text.split())
            pages = len(doc)
            confidence = 1.0  # Assume confidence is high for direct text extraction
            return {
                "text": full_text,
                "pages": pages,
                "confidence": confidence,
                "word_count": word_count
            }
        else:
            # Fallback to OCR on PDF pages
            return self._process_pdf_as_images(pdf_path)


    def _process_pdf_as_images(self, pdf_path: str) -> Dict[str, Any]:
        pages = convert_from_path(pdf_path)
        all_text, all_conf = [], []

        for page in pages:
            
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                tmp_path = tmp.name
                page.save(tmp_path, "JPEG")

            # Reopen image to ensure it's fully closed from temp creation
            image = Image.open(tmp_path)
            result = ocr_model.ocr(np.array(image), cls=True)
            image.close()  # <-- Important to release handle

            # Now it's safe to delete
            os.unlink(tmp_path)

            if result and result[0]:
                for line in result[0]:
                    text, conf = line[1][0], line[1][1]
                    all_text.append(text)
                    all_conf.append(conf)

        combined_text = " ".join(all_text)
        avg_conf = sum(all_conf) / len(all_conf)

        return {
            "text": combined_text,
            "pages": len(pages),
            "confidence": avg_conf,
            "word_count": len(combined_text.split())
        }


    def store_document(self, doc_id: str, content: dict, timestamp: str) -> None:
        """Store document in vector database with timestamp metadata and namespacing."""
    
        # Prefix doc ID to ensure uniqueness per session
        full_doc_id = f"{timestamp}_{doc_id}"
        
        self.collection.add(
            documents=[content["text"]],
            metadatas=[{
                "pages": content["pages"],
                "confidence": content["confidence"],
                "word_count": content["word_count"],
                "timestamp": timestamp,
                "doc_id": doc_id  # Optional: store original short ID too
            }],
                ids=[full_doc_id]
            )
        print('ChromaDB: ',self.collection.get(ids=[full_doc_id]))
        return

    def search_documents(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant documents using vector similarity."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results