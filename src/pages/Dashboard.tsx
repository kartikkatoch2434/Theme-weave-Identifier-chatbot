
import React, { useState } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import DocumentList from "@/components/DocumentList";
import ChatInterface from "@/components/ChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const Dashboard = () => {
  const { documents } = useDocuments();
  const [activeTab, setActiveTab] = useState<string>("documents");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-white shadow-sm py-4 border-b">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-theme-blue hover:opacity-80 transition-opacity">
            DocTheme Explorer
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            </span>
            <Button 
              variant="outline"
              size="sm"
              className="border-theme-blue text-theme-blue hover:bg-theme-blue hover:text-white"
              onClick={() => setActiveTab("chat")}
              disabled={documents.length === 0}
            >
              Start Research
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs
          defaultValue="documents"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="documents">Document Management</TabsTrigger>
            <TabsTrigger value="chat" disabled={documents.length === 0}>
              Research & Themes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
                <Separator className="mb-4" />
                <DocumentUploader />
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                <Separator className="mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    • You need to upload at least 75 documents for optimal theme detection
                  </p>
                  <p className="text-sm text-gray-600">
                    • Supported formats: PDF, JPG, PNG, TIFF (OCR will be applied to scanned documents)
                  </p>
                  <p className="text-sm text-gray-600">
                    • Max file size: 10MB per document
                  </p>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Current Progress:</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-theme-blue h-2.5 rounded-full" 
                      style={{ width: `${Math.min(Math.round(documents.length / 75 * 100), 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-1 text-gray-600">
                    {documents.length}/75 documents uploaded
                    {documents.length >= 75 ? " (Requirement met! ✓)" : ""}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Document Library</h2>
                {documents.length > 0 && (
                  <Button 
                    onClick={() => setActiveTab("chat")}
                    className="bg-theme-blue hover:bg-theme-dark-blue"
                  >
                    Proceed to Research
                  </Button>
                )}
              </div>
              <Separator className="mb-4" />
              <DocumentList />
            </div>
          </TabsContent>
          
          <TabsContent value="chat">
            <div className="bg-white p-6 rounded-lg shadow-sm border h-[calc(100vh-200px)] min-h-[600px]">
              <ChatInterface />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
