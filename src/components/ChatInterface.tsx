
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
  const { documents } = useDocuments();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate document responses
      const documentResponses: DocumentResponse[] = documents.map(doc => ({
        documentId: doc.id,
        documentName: doc.name,
        answer: `Sample response from document "${doc.name}" related to query.`,
        citation: `Page ${Math.floor(Math.random() * 20) + 1}, Paragraph ${Math.floor(Math.random() * 5) + 1}`
      }));
      
      // Generate themes
      const themes: Theme[] = [
        {
          id: uuidv4(),
          title: "Primary Theme",
          description: "This is the primary theme identified across multiple documents.",
          documents: documents.slice(0, Math.floor(documents.length * 0.8)).map(d => d.id)
        },
        {
          id: uuidv4(),
          title: "Secondary Theme",
          description: "This is a secondary theme found in some documents.",
          documents: documents.slice(0, Math.floor(documents.length * 0.5)).map(d => d.id)
        }
      ];
      
      // Simulate AI response
      const aiResponse = `Based on the analysis of ${documents.length} documents, I've identified several key themes:\n\n`;
      const themeContent = themes.map(theme => 
        `**${theme.title}:**\n${theme.description}\nFound in ${theme.documents.length} documents.`
      ).join("\n\n");
      
      addAssistantMessage(aiResponse + themeContent, documentResponses, themes);
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
                              <ThemeVisualizer themes={message.themes} documents={documents} />
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
