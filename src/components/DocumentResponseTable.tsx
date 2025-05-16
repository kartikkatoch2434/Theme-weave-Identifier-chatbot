
import React, { useState } from "react";
import { DocumentResponse } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentResponseTableProps {
  responses: DocumentResponse[];
}

const DocumentResponseTable: React.FC<DocumentResponseTableProps> = ({ responses }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter responses based on search term
  const filteredResponses = responses.filter(response => 
    response.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Individual Document Responses</h3>
        <div className="relative w-64">
          <Input
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <div className="absolute left-2.5 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Document</TableHead>
              <TableHead className="w-1/2">Response</TableHead>
              <TableHead className="w-1/4">Citation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResponses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  No responses found matching "{searchTerm}"
                </TableCell>
              </TableRow>
            ) : (
              filteredResponses.map((response) => (
                <TableRow key={response.documentId}>
                  <TableCell className="font-medium">{response.documentName}</TableCell>
                  <TableCell>{response.answer}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {response.citation}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DocumentResponseTable;
