
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
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
  
    setUploading(true);
    setUploadProgress(0);
  
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append("files", file);  // `files` must match FastAPI parameter name
    });
  
    try {
      const response = await fetch("http://localhost:3000/api/documents/upload", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("Upload failed");
      }
  
      const result = await response.json();
      const uploadedDocs = result.documents || [];
  
      uploadedDocs.forEach((doc: any) => {
        addDocument({
          id: doc.document_id,
          name: doc.filename,
          type: "",  // <-- add this! Use file MIME type or empty string if unknown
          uploadDate: doc.timestamp,
          size: 0,
          content: `Processed ${doc.pages} page(s), ${doc.word_count} words.`,
          status: "ready",
          meta: {
            wordCount: doc.word_count,
            confidence: doc.confidence,
          },
        });        
      });
      
  
      setUploadProgress(100);
      toast.success(`Uploaded ${uploadedDocs.length} document${uploadedDocs.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error(error);
      toast.error("Error uploading documents.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
// const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//   const files = event.target.files;
//   if (!files || files.length === 0) return;

//   setUploading(true);
//   setUploadProgress(0);

//   const formData = new FormData();
//   Array.from(files).forEach(file => {
//     formData.append("files", file);  // `files` must match FastAPI parameter name
//   });

//   try {
//     const response = await fetch("http://localhost:3000/api/documents/upload", {
//       method: "POST",
//       body: formData,
//     });

//     if (!response.ok) {
//       throw new Error("Upload failed");
//     }

//     const result = await response.json();
//     const uploadedDocs = result.documents || [];

//     uploadedDocs.forEach((doc: any) => {
//       addDocument({
//         id: doc.document_id,
//         name: doc.filename,
//         uploadDate: doc.timestamp,
//         size: 0, // Optional: fetch from original file?
//         content: `Processed ${doc.pages} page(s), ${doc.word_count} words.`,
//         status: 'ready',
//         meta: {
//           wordCount: doc.word_count,
//           confidence: doc.confidence
//         }
//       });
//     });

//     setUploadProgress(100);
//     toast.success(`Uploaded ${uploadedDocs.length} document${uploadedDocs.length !== 1 ? 's' : ''}`);
//   } catch (error) {
//     console.error(error);
//     toast.error("Error uploading documents.");
//   } finally {
//     setUploading(false);
//     if (fileInputRef.current) fileInputRef.current.value = '';
//   }
// };

  
  
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
