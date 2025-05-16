
import React, { useState } from "react";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatDistance } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const DocumentList: React.FC = () => {
  const { 
    documents, 
    removeDocument, 
    selectedDocuments, 
    toggleDocumentSelection,
    clearDocumentSelection,
    selectAllDocuments,
  } = useDocuments();
  const [searchTerm, setSearchTerm] = useState("");

  // Format file size to human-readable
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedDocuments.size === 0) return;
    
    selectedDocuments.forEach(id => {
      removeDocument(id);
    });
    
    clearDocumentSelection();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <div className="absolute left-2.5 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        
        <div className="flex gap-2">
          {selectedDocuments.size > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearDocumentSelection}
              className="text-sm"
            >
              Clear Selection ({selectedDocuments.size})
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={selectAllDocuments}
            className="text-sm"
          >
            Select All
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedDocuments.size === 0}
            className="text-sm"
          >
            Delete Selected
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-gray-50">
          <p className="text-gray-500">No documents uploaded yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload documents to get started with your research.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedDocuments.size === documents.length && documents.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllDocuments();
                      } else {
                        clearDocumentSelection();
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No documents found matching "{searchTerm}"
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedDocuments.has(doc.id)}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      {doc.type.split('/')[1]?.toUpperCase() || doc.type}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    <TableCell>
                      {formatDistance(new Date(doc.uploadDate), new Date(), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {doc.status === 'ready' ? (
                        <Badge className="bg-green-500">Ready</Badge>
                      ) : doc.status === 'processing' ? (
                        <Badge variant="outline" className="animate-pulse-opacity">Processing</Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
