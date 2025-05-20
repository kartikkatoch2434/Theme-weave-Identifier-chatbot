# Document Research & Theme Identification Chatbot Backend

This is the backend service for the Document Research & Theme Identification Chatbot. It provides APIs for document processing, theme identification, and document management.

## Features

- Document upload and processing
- OCR for scanned documents and PDFs
- Vector-based document search
- Theme identification using LLMs (OpenAI GPT-4 or Google Gemini)
- User authentication
- Document citation tracking

## Prerequisites

- Python 3.8+
- Tesseract OCR
- Virtual environment (recommended)

## Installation

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy the environment template and fill in your values:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
- Add your OpenAI API key or Google API key
- Set your secret key for JWT
- Configure Tesseract path if needed

## Running the Server

Development:
```bash
uvicorn app.main:app --reload --port 3000
```

Production:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/token` - Get access token

### Documents
- POST `/api/documents/upload` - Upload document
- POST `/api/documents/query` - Search documents
- POST `/api/documents/identify-themes` - Identify themes in documents

### Themes
- POST `/api/themes/analyze` - Analyze themes across documents
- GET `/api/themes/summary/{theme_id}` - Get theme summary

### Query
- POST `/api/query/documents` - Allow user to query docs using natural language

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── documents.py
│   │   └── themes.py
│   ├── core/
│   │   └── config.py
│   ├── models/
│   ├── services/
│   │   ├── document_processor.py
│   │   └── theme_identifier.py
│   └── main.py
├── data/
│   ├── uploads/
│   └── chroma/
├── tests/
└── requirements.txt
```

## Testing

Run tests using pytest:
```bash
pytest
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 413: Payload Too Large
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 