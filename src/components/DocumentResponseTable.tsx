import React, { useState } from "react";
import { DocumentResponse, Citation } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface DocumentResponseTableProps {
  responses: DocumentResponse[];
}

interface HighlightedCitation {
  documentId: string;
  citation: string;
}

const DocumentResponseTable: React.FC<DocumentResponseTableProps> = ({ responses }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedCitation, setHighlightedCitation] = useState<HighlightedCitation | null>(null);
  const [hoveredParagraphCitations, setHoveredParagraphCitations] = useState<string[] | null>(null);
  
  // Filter responses based on search term
  const filteredResponses = responses.filter(response => 
    response.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCitation = async (citation: string) => {
    try {
      await navigator.clipboard.writeText(citation);
      toast.success("Citation copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy citation");
    }
  };

  // Helper: Copy the sentence(s) containing the citation from the response
  const copyCitationText = (citation: string, response: string) => {
    // Split response into sentences
    const sentences = response.split(/(?<=[.!?])\s+/);
    // Find all sentences containing the citation string
    const matchingSentences = sentences.filter(sentence =>
      sentence.includes(citation)
    );
    const textToCopy = matchingSentences.join(' ');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      toast.success("Text under citation copied to clipboard");
    } else {
      toast.error("No matching text found for this citation");
    }
  };

  const highlightText = (text: string, citation: Citation, documentId: string) => {
    if (highlightedCitation?.documentId !== documentId) {
      return text;
    }
    const sentences = text.split(/(?<=[.!?])\s+/);
    const citationPattern = new RegExp(citation.full_citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const highlightedSentences = sentences.map(sentence => {
      if (citationPattern.test(sentence)) {
        return `<span class=\"bg-yellow-200 px-1 rounded\">${sentence}</span>`;
      }
      return sentence;
    });
    return highlightedSentences.join(' ');
  };

  // Helper: Split response into paragraphs with their citations
  const getParagraphsWithCitations = (response: string, citations: Citation[]) => {
    if (!citations || citations.length === 0) return [{ text: response, citations: [] }];
    let paragraphs: { text: string; citations: string[] }[] = [];
    let lastIndex = 0;
    const citationRegex = /\([^\)]*page [^\)]*\)/g;
    let match;
    while ((match = citationRegex.exec(response)) !== null) {
      const beforeCitation = response.slice(lastIndex, match.index).trim();
      const citationText = match[0];
      if (beforeCitation) {
        paragraphs.push({ text: beforeCitation, citations: [] });
      }
      // Attach the citation to the previous paragraph (or as its own if no text before)
      if (paragraphs.length > 0) {
        paragraphs[paragraphs.length - 1].citations.push(citationText);
      } else {
        paragraphs.push({ text: '', citations: [citationText] });
      }
      lastIndex = citationRegex.lastIndex;
    }
    const afterLast = response.slice(lastIndex).trim();
    if (afterLast) paragraphs.push({ text: afterLast, citations: [] });
    // Remove citation text from each paragraph
    paragraphs = paragraphs.map(p => {
      let cleanedP = p.text;
      p.citations.forEach(citation => {
        const pattern = new RegExp(`\\s*${citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
        cleanedP = cleanedP.replace(pattern, '');
      });
      // Trim leading punctuation and whitespace
      cleanedP = cleanedP.replace(/^[\s\.,;:!?-]+/, '');
      return { text: cleanedP.trim(), citations: p.citations };
    }).filter(p => p.text);
    return paragraphs;
  };

  // Helper: Render citations for a paragraph
  const renderParagraphCitations = (paraCitations: string[], allCitations: Citation[], response: string, documentId: string, hoveredParagraphCitations: string[] | null) => {
    if (!paraCitations || paraCitations.length === 0) {
      return <span className="text-gray-400">No citations</span>;
    }
    const citationObjs = allCitations.filter(cit => paraCitations.includes(cit.full_citation));
    const joined = citationObjs.map(c => c.full_citation).join('; ');
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="truncate max-w-[180px] cursor-pointer px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-theme-blue hover:bg-gray-100"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              tabIndex={0}
            >
              {joined}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white p-3 shadow-lg rounded-lg border min-w-[200px]">
            <div className="space-y-2">
              <p className="font-medium mb-1">Citations:</p>
              {citationObjs.map((citation, idx) => (
                <div key={idx} className="flex flex-col mb-1">
                  <span
                    className={`text-xs text-gray-800 cursor-pointer ${
                      (highlightedCitation && highlightedCitation.documentId === documentId && highlightedCitation.citation === citation.full_citation) ||
                      (hoveredParagraphCitations && hoveredParagraphCitations.includes(citation.full_citation))
                        ? 'bg-yellow-200' : ''}`}
                    onMouseEnter={() => setHighlightedCitation({ documentId, citation: citation.full_citation })}
                    onMouseLeave={() => setHighlightedCitation(null)}
                    onClick={() => copyCitationText(citation.full_citation, response)}
                  >
                    {citation.full_citation}
                  </span>
                  <span className="text-xs text-gray-500">Page: {citation.page}, Para: {citation.paragraph}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderResponse = (response: string, citations: Citation[], documentId: string) => {
    // Always use the cleaned, paragraph-separated version, and highlight if needed
    return getParagraphsWithCitations(response, citations).map((para, idx) => (
      <p key={response.documentId + '-' + idx} className={`mb-2 whitespace-pre-wrap${highlightedCitation && highlightedCitation.documentId === documentId && para.citations.includes(highlightedCitation.citation) ? ' bg-yellow-200' : ''}`}>{para.text}</p>
    ));
  };
  
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
              <TableHead className="w-2/4">Response</TableHead>
              <TableHead className="w-1/4">Citations</TableHead>
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
              filteredResponses.flatMap((response) => {
                const paragraphs = getParagraphsWithCitations(response.answer, response.citations);
                return [
                  // Document header row
                  <TableRow key={response.documentId + '-header'}>
                    <TableCell colSpan={3} className="bg-theme-blue text-white font-bold text-lg border-t-4 border-theme-blue">
                      {response.documentName}
                    </TableCell>
                  </TableRow>,
                  // Paragraph rows
                  ...paragraphs.map((para, idx) => (
                    <TableRow key={response.documentId + '-' + idx}>
                      <TableCell className="font-medium"></TableCell>
                      <TableCell
                        className={`whitespace-pre-wrap${
                          (highlightedCitation && highlightedCitation.documentId === response.documentId && para.citations.includes(highlightedCitation.citation)) ||
                          (hoveredParagraphCitations && para.citations.some(cit => hoveredParagraphCitations.includes(cit)))
                            ? ' bg-yellow-200' : ''
                        }`}
                        onMouseEnter={() => setHoveredParagraphCitations(para.citations)}
                        onMouseLeave={() => setHoveredParagraphCitations(null)}
                      >
                        {para.text}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderParagraphCitations(para.citations, response.citations, response.answer, response.documentId, hoveredParagraphCitations)}
                      </TableCell>
                    </TableRow>
                  ))
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DocumentResponseTable;
