
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDocuments } from "@/context/DocumentContext";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

const DocumentUploader: React.FC = () => {
  const { addDocument } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    // Convert FileList to array so we can iterate through it
    const fileArray = Array.from(files);
    
    // Set up mock processing for demo purposes
    const totalFiles = fileArray.length;
    let processed = 0;
    
    fileArray.forEach((file, index) => {
      // Simulate processing delay
      setTimeout(() => {
        // Simulate OCR/processing
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const content = e.target?.result as string;
          
          // Create a document object
          const newDocument = {
            id: uuidv4(),
            name: file.name,
            type: file.type,
            uploadDate: new Date().toISOString(),
            size: file.size,
            content: "Sample extracted content from " + file.name, // In a real app, this would be the extracted text
            status: 'ready' as const
          };
          
          addDocument(newDocument);
          processed++;
          setUploadProgress(Math.round((processed / totalFiles) * 100));
          
          if (processed === totalFiles) {
            setUploading(false);
            toast.success(`Successfully uploaded ${totalFiles} document${totalFiles !== 1 ? 's' : ''}`);
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
        
        reader.onerror = () => {
          processed++;
          setUploadProgress(Math.round((processed / totalFiles) * 100));
          
          toast.error(`Failed to process ${file.name}`);
          
          if (processed === totalFiles) {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
        
        reader.readAsText(file);
      }, 500 + index * 300); // Stagger the processing to simulate real-world behavior
    });
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={triggerFileInput}
      >
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.tiff"
          ref={fileInputRef}
          disabled={uploading}
        />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-lg font-medium mb-2">
          {uploading ? "Uploading documents..." : "Drag & drop files or click to upload"}
        </p>
        <p className="text-sm text-gray-500">
          Supports PDF, JPG, PNG, TIFF (Max: 10MB per file)
        </p>
      </div>
      
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-gray-500 text-center">{uploadProgress}% complete</p>
        </div>
      )}
      
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full"
        >
          Select Files
        </Button>
      </div>
    </div>
  );
};

export default DocumentUploader;
