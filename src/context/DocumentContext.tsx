import React, { createContext, useContext, useState } from "react";
import { Document } from "@/types";
import { toast } from "sonner";

interface DocumentContextType {
  documents: Document[];
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  selectedDocuments: Set<string>;
  toggleDocumentSelection: (id: string) => void;
  clearDocumentSelection: () => void;
  selectAllDocuments: () => void;
  getCurrentSessionTimestamps: () => string[];
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return context;
};

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  const addDocument = (document: Document) => {
    setDocuments((prev) => [...prev, document]);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    setSelectedDocuments((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    toast.success("Document removed successfully");
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          // If we're updating with a new document from the upload response
          if (updates.uploadDate) {
            // Use the exact timestamp from the upload response
            const timestamp = updates.uploadDate;
            console.log("Using timestamp from upload response:", timestamp);
            return { ...doc, ...updates, uploadDate: timestamp };
          }
          return { ...doc, ...updates };
        }
        return doc;
      })
    );
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocuments((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const clearDocumentSelection = () => {
    setSelectedDocuments(new Set());
  };

  const selectAllDocuments = () => {
    const allIds = documents.map(doc => doc.id);
    setSelectedDocuments(new Set(allIds));
  };

  const getCurrentSessionTimestamps = () => {
    const timestamps = new Set<string>();
    documents.forEach(doc => {
      if (doc.uploadDate) {
        // Use the exact timestamp as stored
        timestamps.add(doc.uploadDate);
      }
    });
    console.log("Current session timestamps:", Array.from(timestamps));
    return Array.from(timestamps);
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        addDocument,
        removeDocument,
        updateDocument,
        selectedDocuments,
        toggleDocumentSelection,
        clearDocumentSelection,
        selectAllDocuments,
        getCurrentSessionTimestamps,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};
