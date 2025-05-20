export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: number;
  content?: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
  
  meta?: {
    wordCount: number;
    confidence: number;
  };
}

export interface Citation {
  page: string;
  paragraph: string;
  full_citation: string;
}

export interface DocumentResponse {
  documentId: string;
  documentName: string;
  answer: string;
  citations: Citation[];
}

export interface Theme {
  id: string;
  title: string;
  description: string;
  documents: string[]; // Document IDs
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  themes?: Theme[];
  documentResponses?: DocumentResponse[];
}

