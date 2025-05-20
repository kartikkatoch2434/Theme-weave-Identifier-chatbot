import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const SUPPORTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'];

interface FileConflict {
  file: File;
  existingDoc: any;
}

interface DocumentMeta {
  pages: number;
  wordCount: number;
  confidence: number;
}

const DocumentUploader: React.FC = () => {
  const { addDocument, updateDocument, documents, removeDocument } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflicts: FileConflict[];
    remainingFiles: File[];
  }>({
    open: false,
    conflicts: [],
    remainingFiles: [],
  });
  
  const validateFiles = (files: FileList): boolean => {
    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      // Check file type
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_TYPES.includes(fileExt)) {
        toast.error(`File ${file.name} has unsupported format. Supported formats: PDF, JPG, PNG, TIFF`);
        return false;
      }
    }
    return true;
  };

  const checkFileConflicts = (files: File[]): { conflicts: FileConflict[], uniqueFiles: File[] } => {
    const conflicts: FileConflict[] = [];
    const uniqueFiles: File[] = [];

    files.forEach(file => {
      const existingDoc = documents.find(doc => doc.name === file.name);
      if (existingDoc) {
        conflicts.push({ file, existingDoc });
      } else {
        uniqueFiles.push(file);
      }
    });

    return { conflicts, uniqueFiles };
  };

  const handleConflictResolution = async (overwrite: boolean) => {
    const { conflicts, remainingFiles } = conflictDialog;
    
    if (overwrite) {
      // Remove existing documents that will be overwritten
      conflicts.forEach(({ existingDoc }) => {
        removeDocument(existingDoc.id); // Remove the old document completely
      });
    }

    // Upload all files (both overwritten and new)
    const allFiles = [...(overwrite ? conflicts.map(c => c.file) : []), ...remainingFiles];
    await uploadFiles(allFiles);
    
    setConflictDialog({ open: false, conflicts: [], remainingFiles: [] });
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
  
    const formData = new FormData();
    const tempDocIds: string[] = [];
    
    // Add files to form data and create temporary documents
    files.forEach(file => {
      formData.append("files", file);
      const tempId = `temp_${Date.now()}_${file.name}`;
      tempDocIds.push(tempId);
      addDocument({
        id: tempId,
        name: file.name,
        type: file.type,
        uploadDate: new Date().toISOString(),
        size: file.size,
        content: '',
        status: 'processing',
      });
    });

    try {
      const response = await fetch("http://localhost:3000/api/documents/upload_multiple", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }
  
      const result = await response.json();
      const uploadedDocs = result.documents || [];
  
      // Update temporary documents with backend response
      uploadedDocs.forEach((doc: any, index: number) => {
        const tempId = tempDocIds[index];
        if (tempId) {
          updateDocument(tempId, {
            id: doc.document_id,
            name: doc.filename,
            type: doc.filename.split('.').pop()?.toLowerCase() || '',
            uploadDate: new Date().toISOString(),
            size: files[index].size,
            content: `Processed ${doc.pages} page(s), ${doc.word_count} words.`,
            status: "ready",
            meta: {
              pages: doc.pages,
              wordCount: doc.word_count,
              confidence: doc.confidence,
            } as DocumentMeta,
          });
        }
      });
      
      setUploadProgress(100);
      toast.success(`Uploaded ${uploadedDocs.length} document${uploadedDocs.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error uploading documents.");
      
      // Remove temporary documents on error
      tempDocIds.forEach(id => {
        removeDocument(id); // Remove the temporary document completely
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Validate files before upload
    if (!validateFiles(files)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileArray = Array.from(files);
    const { conflicts, uniqueFiles } = checkFileConflicts(fileArray);

    if (conflicts.length > 0) {
      // Show conflict dialog
      setConflictDialog({
        open: true,
        conflicts,
        remainingFiles: uniqueFiles,
      });
    } else {
      // No conflicts, proceed with upload
      await uploadFiles(fileArray);
    }
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
          name="files"
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

      <AlertDialog open={conflictDialog.open} onOpenChange={(open) => !open && setConflictDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>File Conflicts Detected</AlertDialogTitle>
            <AlertDialogDescription>
              The following files already exist in your document list:
              <ul className="mt-2 space-y-1">
                {conflictDialog.conflicts.map(({ file }) => (
                  <li key={file.name} className="text-sm">• {file.name}</li>
                ))}
              </ul>
              Would you like to overwrite these files or skip them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConflictResolution(false)}>
              Skip
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConflictResolution(true)}>
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentUploader;
