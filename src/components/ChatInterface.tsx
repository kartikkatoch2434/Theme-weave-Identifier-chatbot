import React, { useRef, useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentResponse, Theme } from "@/types";
import { v4 as uuidv4 } from "uuid";
import ThemeVisualizer from "./ThemeVisualizer";
import DocumentResponseTable from "./DocumentResponseTable";
import { toast } from "sonner";

const ChatInterface: React.FC = () => {
  const { messages, addUserMessage, addAssistantMessage, clearMessages } = useChat();
  const { documents, getCurrentSessionTimestamps } = useDocuments();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    const fetchThemes = async () => {
      const timestamps = getCurrentSessionTimestamps();
      if (!timestamps.length) return;
      try {
        const response = await fetch(`http://localhost:3000/api/themes/analyze?timestamp=${encodeURIComponent(timestamps.join(','))}`);
        if (!response.ok) throw new Error("Failed to fetch themes");
        const data = await response.json();
        setThemes(data.themes || []);
      } catch (err) {
        setThemes([]);
        toast.error("Failed to fetch themes");
      }
    };
    fetchThemes();
  }, [documents]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;
    
    addUserMessage(inputValue);
    setInputValue("");
    
    // Simulate AI processing
    setIsTyping(true);
    
    try {
      // Get all timestamps from current session
      const timestamps = getCurrentSessionTimestamps();
      
      if (timestamps.length === 0) {
        throw new Error('No documents available for querying');
      }
      
      // Make API call to query endpoint with all timestamps
      const timestampParam = timestamps.join(',');
      const response = await fetch(`http://localhost:3000/api/query/query_documents?q=${encodeURIComponent(inputValue)}&timestamp=${timestampParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }
      
      const data = await response.json();
      
      // Transform the response into DocumentResponse format
      const documentResponses: DocumentResponse[] = data.results.map((result: any) => ({
        documentId: result.doc_id,
        documentName: documents.find(doc => doc.id === result.doc_id)?.name || 'Unknown Document',
        answer: result.response,
        citations: result.citations || [] // Use the citations array from the backend
      }));
      
      // Show the combined answer in the chat
      const combinedAnswer = data.combined_answer || "No combined answer available.";
      addAssistantMessage(combinedAnswer, documentResponses, themes);
    } catch (error) {
      console.error("Error processing query:", error);
      toast.error("An error occurred while processing your query");
    } finally {
      setIsTyping(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Research Assistant</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={clearMessages}
          disabled={messages.length === 0}
        >
          Clear Chat
        </Button>
      </div>
      <Separator className="mb-4" />
      
      <div className="flex-1 overflow-y-auto mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
            <div className="text-5xl">🔍</div>
            <h3 className="text-xl font-medium">Ask a research question</h3>
            <p className="max-w-md text-sm">
              I'll analyze all your documents, identify themes, and provide answers with citations to the source materials.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border max-w-md w-full mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Example questions:</p>
              <ul className="space-y-2 text-sm text-left">
                <li 
                  className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => setInputValue("What are the main themes across these documents?")}
                >
                  "What are the main themes across these documents?"
                </li>
                <li 
                  className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => setInputValue("Summarize the key findings from all documents.")}
                >
                  "Summarize the key findings from all documents."
                </li>
                <li 
                  className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => setInputValue("What are the contradictions between documents?")}
                >
                  "What are the contradictions between documents?"
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user" 
                      ? "bg-theme-blue text-white rounded-tr-none" 
                      : "bg-gray-100 text-gray-800 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Show themes and document responses for AI messages */}
                  {message.role === "assistant" && message.themes && message.documentResponses && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs bg-white text-theme-blue hover:bg-gray-50">
                            View Analysis Details
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Document Analysis</SheetTitle>
                          </SheetHeader>
                          
                          <Tabs defaultValue="themes" className="mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="themes">Themes</TabsTrigger>
                              <TabsTrigger value="documents">Document Responses</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="themes" className="mt-4 space-y-4">
                              <ThemeVisualizer themes={themes} documents={documents} />
                            </TabsContent>
                            
                            <TabsContent value="documents" className="mt-4">
                              <DocumentResponseTable responses={message.documentResponses} />
                            </TabsContent>
                          </Tabs>
                        </SheetContent>
                      </Sheet>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 rounded-tl-none inline-flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-sm text-gray-500">Analyzing documents...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="border-t pt-4 bg-white">
        <div className="flex space-x-2">
          <Textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a research question..."
            className="resize-none"
            rows={2}
            disabled={isTyping}
          />
          <Button 
            onClick={handleSendMessage} 
            className="bg-theme-blue hover:bg-theme-dark-blue"
            disabled={inputValue.trim() === "" || isTyping}
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Analyzing {documents.length} document{documents.length !== 1 ? 's' : ''}{isTyping ? " - please wait while I process your query" : ""}
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
