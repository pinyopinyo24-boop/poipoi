/**
 * File Processing Screen
 * PDF/Excel/画像ファイル処理UI
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'image';
  size: number;
  uploadedAt: number;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    pages?: number;
    rows?: number;
    columns?: number;
    width?: number;
    height?: number;
    text?: string;
    summary?: string;
  };
}

export default function FileProcessing() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileType = file.name.split('.').pop()?.toLowerCase();

      let type: 'pdf' | 'excel' | 'image' = 'pdf';
      if (fileType === 'xlsx' || fileType === 'xls') {
        type = 'excel';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType || '')) {
        type = 'image';
      }

      const newFile: FileItem = {
        id: `file_${Date.now()}_${i}`,
        name: file.name,
        type,
        size: file.size,
        uploadedAt: Date.now(),
        status: 'processing',
        progress: 0,
      };

      setFiles(prev => [...prev, newFile]);

      // Simulate processing
      simulateProcessing(newFile.id);
    }
  };

  const simulateProcessing = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setFiles(prev =>
          prev.map(f => {
            if (f.id === fileId) {
              return {
                ...f,
                status: 'completed',
                progress: 100,
                result: generateMockResult(f.type),
              };
            }
            return f;
          })
        );
      } else {
        setFiles(prev =>
          prev.map(f => {
            if (f.id === fileId) {
              return { ...f, progress };
            }
            return f;
          })
        );
      }
    }, 500);
  };

  const generateMockResult = (type: 'pdf' | 'excel' | 'image') => {
    switch (type) {
      case 'pdf':
        return {
          pages: Math.floor(Math.random() * 50) + 1,
          text: 'PDFファイルが正常に解析されました。テキスト抽出完了。',
          summary: 'このPDFドキュメントは、製造プロセスの最適化に関する情報を含んでいます。',
        };
      case 'excel':
        return {
          rows: Math.floor(Math.random() * 1000) + 100,
          columns: Math.floor(Math.random() * 20) + 5,
          text: 'Excelファイルが正常に解析されました。',
          summary: '売上データ、コスト情報、在庫レベルが含まれています。',
        };
      case 'image':
        return {
          width: 1920,
          height: 1080,
          text: '画像が正常に解析されました。',
          summary: '製造設備の画像。品質チェック対象。',
        };
    }
  };

  const getFileIcon = (type: 'pdf' | 'excel' | 'image') => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'excel':
        return '📊';
      case 'image':
        return '🖼️';
    }
  };

  const getFileTypeLabel = (type: 'pdf' | 'excel' | 'image') => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      case 'image':
        return '画像';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadResult = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.result) {
      const dataStr = JSON.stringify(file.result, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name}_result.json`;
      link.click();
    }
  };

  const completedFiles = files.filter(f => f.status === 'completed').length;
  const processingFiles = files.filter(f => f.status === 'processing').length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            ファイル処理
          </h1>
          <p className="text-lg text-muted-foreground">
            PDF・Excel・画像ファイルをアップロードして分析
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">総ファイル数</p>
            <p className="text-3xl font-bold text-foreground">{files.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">処理中</p>
            <p className="text-3xl font-bold text-yellow-600">{processingFiles}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">完了</p>
            <p className="text-3xl font-bold text-green-600">{completedFiles}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upload">アップロード</TabsTrigger>
            <TabsTrigger value="processing">処理中 ({processingFiles})</TabsTrigger>
            <TabsTrigger value="completed">完了 ({completedFiles})</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="p-8 border-2 border-dashed border-border">
              <div className="flex flex-col items-center justify-center">
                <FileUp className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  ファイルをアップロード
                </h3>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  PDF、Excel、画像ファイルをドラッグ&ドロップするか、
                  <br />
                  下のボタンをクリックして選択してください
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-4"
                >
                  ファイルを選択
                </Button>

                <p className="text-xs text-muted-foreground">
                  対応形式: PDF, Excel (xlsx/xls), 画像 (jpg/png/gif/webp)
                </p>
              </div>
            </Card>

            {/* File Type Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-6">
                <h4 className="font-semibold text-foreground mb-2">📄 PDF</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  テキスト抽出、ページ数検出、内容要約
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ テキスト抽出</li>
                  <li>✓ ページ数検出</li>
                  <li>✓ 内容要約</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-foreground mb-2">📊 Excel</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  データ解析、統計計算、トレンド検出
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ データ解析</li>
                  <li>✓ 統計計算</li>
                  <li>✓ トレンド検出</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-foreground mb-2">🖼️ 画像</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  OCR、物体検出、品質分析
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ OCR</li>
                  <li>✓ 物体検出</li>
                  <li>✓ 品質分析</li>
                </ul>
              </Card>
            </div>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing">
            <div className="space-y-4">
              {files
                .filter(f => f.status === 'processing')
                .map(file => (
                  <Card key={file.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">
                          {getFileIcon(file.type)}
                        </span>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {file.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {getFileTypeLabel(file.type)} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">処理中</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">進捗</span>
                        <span className="font-semibold text-foreground">
                          {Math.round(file.progress)}%
                        </span>
                      </div>
                      <Progress value={file.progress} />
                    </div>
                  </Card>
                ))}

              {files.filter(f => f.status === 'processing').length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    処理中のファイルはありません
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed">
            <div className="space-y-4">
              {files
                .filter(f => f.status === 'completed')
                .map(file => (
                  <Card key={file.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">
                          {getFileIcon(file.type)}
                        </span>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {file.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {getFileTypeLabel(file.type)} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <Badge variant="default">完了</Badge>
                      </div>
                    </div>

                    {/* Results */}
                    {file.result && (
                      <div className="bg-background p-4 rounded-md mb-4 space-y-2">
                        {file.result.pages && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">ページ数:</span>
                            <span className="font-mono text-foreground">
                              {file.result.pages}
                            </span>
                          </div>
                        )}
                        {file.result.rows && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">行数:</span>
                            <span className="font-mono text-foreground">
                              {file.result.rows}
                            </span>
                          </div>
                        )}
                        {file.result.columns && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">列数:</span>
                            <span className="font-mono text-foreground">
                              {file.result.columns}
                            </span>
                          </div>
                        )}
                        {file.result.width && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">解像度:</span>
                            <span className="font-mono text-foreground">
                              {file.result.width}x{file.result.height}
                            </span>
                          </div>
                        )}
                        {file.result.summary && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">
                              要約:
                            </p>
                            <p className="text-sm text-foreground">
                              {file.result.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadResult(file.id)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      結果をダウンロード
                    </Button>
                  </Card>
                ))}

              {files.filter(f => f.status === 'completed').length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    完了したファイルはありません
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
