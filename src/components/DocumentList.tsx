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
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Format date safely
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    
    try {
      // TODO: Add backend API call to delete documents
      // For now, just remove from frontend state
      selectedDocuments.forEach(id => {
        removeDocument(id);
      });
      
      clearDocumentSelection();
      toast.success("Documents deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error deleting documents");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-green-500">
            Ready
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="animate-pulse-opacity">
            Processing
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined) return null;
    
    const percentage = (confidence * 100).toFixed(1);
    let color = "bg-gray-100 text-gray-800";
    
    if (confidence >= 0.95) {
      color = "bg-green-100 text-green-800";
    } else if (confidence >= 0.8) {
      color = "bg-blue-100 text-blue-800";
    } else if (confidence >= 0.6) {
      color = "bg-yellow-100 text-yellow-800";
    } else {
      color = "bg-red-100 text-red-800";
    }
    
    return (
      <Badge variant="outline" className={color}>
        {percentage}%
      </Badge>
    );
  };

  const DocumentTooltip = ({ doc }: { doc: any }) => {
    const details = [
      { label: "Pages", value: doc.meta?.pages || "N/A" },
      { label: "Words", value: doc.meta?.wordCount?.toLocaleString() || "N/A" },
      { label: "Confidence", value: doc.meta?.confidence ? `${(doc.meta.confidence * 100).toFixed(1)}%` : "N/A" },
      { label: "Size", value: formatFileSize(doc.size) },
      { label: "Uploaded", value: formatDate(doc.uploadDate) },
    ];

    return (
      <div className="space-y-2 p-1">
        <div className="font-medium border-b pb-1">{doc.name}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {details.map(({ label, value }) => (
            <React.Fragment key={label}>
              <span className="text-muted-foreground">{label}:</span>
              <span>{value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
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
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
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
                    <TableCell className="font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{doc.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="w-64">
                            <DocumentTooltip doc={doc} />
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {doc.type.split('/')[1]?.toUpperCase() || doc.type}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    <TableCell>
                      {formatDate(doc.uploadDate)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(doc.meta?.confidence)}
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
