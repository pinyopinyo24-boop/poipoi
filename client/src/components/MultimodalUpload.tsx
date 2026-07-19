import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Music, Video, FileText } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  type: "image" | "audio" | "video" | "document";
  size: number;
  preview?: string;
  progress: number;
}

interface MultimodalUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  maxSize?: number;
}

export const MultimodalUpload: React.FC<MultimodalUploadProps> = ({
  onFilesSelected,
  maxSize = 100 * 1024 * 1024, // 100MB
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (
    mimeType: string
  ): "image" | "audio" | "video" | "document" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    return "document";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleFiles = async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (file.size > maxSize) {
        alert(`ファイルが大きすぎます: ${file.name}`);
        continue;
      }

      const fileType = getFileType(file.type);
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        type: fileType,
        size: file.size,
        progress: 0,
      };

      // Generate preview for images
      if (fileType === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, preview: e.target?.result as string }
                : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadedFile);

      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, progress } : f
          )
        );
      }, 200);
    }

    setFiles((prev) => [...prev, ...newFiles]);
    onFilesSelected([...files, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/50"
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          ファイルをドラッグ&ドロップするか、クリックして選択
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          画像、動画、音声、ドキュメント対応（最大 {(maxSize / 1024 / 1024).toFixed(0)}MB）
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3"
        >
          ファイルを選択
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">アップロード済みファイル ({files.length})</p>
          <div className="grid gap-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center gap-3">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.progress < 100 && (
                      <Progress value={file.progress} className="mt-1 h-1" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
