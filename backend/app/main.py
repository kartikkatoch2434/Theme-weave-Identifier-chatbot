from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import documents, themes, auth, query
from .core.config import settings

app = FastAPI(
    title="Document Research & Theme Identification Chatbot",
    description="API for processing documents, identifying themes, and answering queries with citations",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(themes.router, prefix="/api/themes", tags=["Themes"])
app.include_router(query.router, prefix="/api/query", tags=["Query"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to Document Research & Theme Identification Chatbot API",
        "version": "1.0.0"
    } 