import React from "react";
import { Theme, Document } from "@/types";

interface ThemeVisualizerProps {
  themes: Theme[];
  documents: Document[];
}

const ThemeVisualizer: React.FC<ThemeVisualizerProps> = (props) => {
  // Defensive: always use arrays
  const themes = Array.isArray(props.themes) ? props.themes : [];
  const documents = Array.isArray(props.documents) ? props.documents : [];

  // Helper function to get document name from ID
  const getDocumentName = (id: string): string => {
    const found = documents.find(doc => doc.id === id);
    return found?.name || "Unknown Document";
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Identified Themes</h3>
      
      {themes.map((theme) => (
        <div key={theme.id} className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-lg font-semibold">{theme.title}</h4>
            <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {(theme.documents ?? []).length} document{((theme.documents ?? []).length !== 1) ? 's' : ''}
            </span>
          </div>
          
          <p className="text-gray-700 mb-4">{theme.description}</p>
          
          <div>
            <h5 className="text-sm font-medium mb-2">Supporting Documents:</h5>
            <ul className="space-y-1">
              {(theme.documents ?? []).slice(0, 5).map((docId) => (
                <li key={docId} className="text-sm text-gray-600 flex items-center">
                  <span className="w-2 h-2 bg-theme-blue rounded-full mr-2"></span>
                  {getDocumentName(docId)}
                </li>
              ))}
              {(theme.documents ?? []).length > 5 && (
                <li className="text-sm text-gray-500 italic ml-4">
                  +{((theme.documents ?? []).length - 5)} more documents
                </li>
              )}
            </ul>
          </div>
          
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-blue"
                style={{ width: `${(((theme.documents ?? []).length / documents.length) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Present in {Math.round(((theme.documents ?? []).length / documents.length) * 100)}% of documents
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThemeVisualizer;
