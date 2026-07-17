import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CloudProcessingTab } from '@/components/CloudProcessingTab';
import { LocalProcessingTab } from '@/components/LocalProcessingTab';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { trpc } from '@/lib/trpc';

export default function FaceFusionHybridPage() {
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // Detect device type on mount
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    setIsMobile(isMobileDevice);
  }, []);
  const [sourceFileId, setSourceFileId] = useState<string>();
  const [targetFileId, setTargetFileId] = useState<string>();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  // Auto-select processing method based on device
  const getDefaultTab = () => {
    if (sourceFileId && targetFileId) {
      return isMobile ? 'cloud' : 'local';
    }
    return 'upload';
  };

  // Update active tab when files are uploaded
  useEffect(() => {
    if (sourceFileId && targetFileId) {
      const defaultTab = getDefaultTab();
      if (activeTab === 'upload' || activeTab === 'files') {
        setActiveTab(defaultTab);
      }
    }
  }, [sourceFileId, targetFileId, isMobile, activeTab]);

  // tRPC mutations
  const uploadSourceMutation = trpc.facefusionHybrid.uploadSourceImage.useMutation();
  const uploadTargetMutation = trpc.facefusionHybrid.uploadTargetVideo.useMutation();
  const getFilesMutation = trpc.facefusionHybrid.getUploadedFiles.useMutation();
  const downloadMutation = trpc.facefusionHybrid.downloadResult.useMutation();

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('ソース用の画像ファイルを選択してください');
        return;
      }
      setSourceFile(file);
    }
  };

  const handleTargetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('ターゲット用の動画ファイルを選択してください');
        return;
      }
      setTargetFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const refreshFiles = async () => {
    try {
      const files = await getFilesMutation.mutateAsync();
      setUploadedFiles(files);
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  };

  const handleUploadSource = async () => {
    if (!sourceFile) {
      toast.error('ソース画像を選択してください');
      return;
    }

    try {
      const base64 = await fileToBase64(sourceFile);
      const result = await uploadSourceMutation.mutateAsync({
        filename: sourceFile.name,
        fileData: base64,
        mimeType: sourceFile.type,
      });
      toast.success('ソース画像が正常にアップロードされました');
      setSourceFileId(result.fileId);
      setSourceFile(null);
      if (sourceInputRef.current) sourceInputRef.current.value = '';
      await refreshFiles();
      // Trigger tab switch if target is already uploaded
      if (targetFileId) {
        const defaultTab = isMobile ? 'cloud' : 'local';
        setActiveTab(defaultTab);
      }
    } catch (error) {
      toast.error('ソース画像のアップロードに失敗しました');
      console.error(error);
    }
  };

  const handleUploadTarget = async () => {
    if (!targetFile) {
      toast.error('ターゲット動画を選択してください');
      return;
    }

    try {
      const base64 = await fileToBase64(targetFile);
      const result = await uploadTargetMutation.mutateAsync({
        filename: targetFile.name,
        fileData: base64,
        mimeType: targetFile.type,
      });
      toast.success('ターゲット動画が正常にアップロードされました');
      setTargetFileId(result.fileId);
      setTargetFile(null);
      if (targetInputRef.current) targetInputRef.current.value = '';
      await refreshFiles();
      // Trigger tab switch if source is already uploaded
      if (sourceFileId) {
        const defaultTab = isMobile ? 'cloud' : 'local';
        setActiveTab(defaultTab);
      }
    } catch (error) {
      toast.error('ターゲット動画のアップロードに失敗しました');
      console.error(error);
    }
  };

  const handleDownloadResult = async (fileId: string) => {
    try {
      setDownloading(true);
      const result = await downloadMutation.mutateAsync({ fileId });
      
      if (!result) {
        throw new Error('ファイルデータが見つかりません');
      }

      // Create a blob from the base64 data
      const binaryString = atob(result.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('ファイルが正常にダウンロードされました');
    } catch (error) {
      toast.error('ファイルのダウンロードに失敗しました');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  // Show auth screen if not authenticated
  if (!isGoogleAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">FaceFusion v3.6.1</h1>
            <p className="text-slate-300 mb-4">高品質な顔入れ替え動画生成ツール</p>
            <p className="text-slate-400 text-sm mb-8">Google Driveを使用してクラウドで処理します</p>
          </div>
          <GoogleAuthButton onAuthSuccess={() => setIsGoogleAuthenticated(true)} />
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-300 text-sm">
              ✨ Google で認証すると、以下の機能が使用できます：
            </p>
            <ul className="text-slate-400 text-sm mt-3 space-y-2">
              <li>✅ 無料のGoogle Colab GPU</li>
              <li>✅ 高速な顔入れ替え処理</li>
              <li>✅ 自動結果返却</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FaceFusion v3.6.1</h1>
          <p className="text-slate-300">高品質な顔入れ替え動画生成ツール</p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 gap-1">
            <TabsTrigger value="upload" className="text-xs md:text-sm">📤 アップロード</TabsTrigger>
            <TabsTrigger value="local" className="text-xs md:text-sm">⚙️ ローカル</TabsTrigger>
            <TabsTrigger value="cloud" className="text-xs md:text-sm">☁️ クラウド</TabsTrigger>
            <TabsTrigger value="files" className="text-xs md:text-sm">📁 ファイル</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">ステップ1: ソース画像をアップロード</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition">
                  <input
                    ref={sourceInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSourceFileChange}
                    className="hidden"
                    id="source-input"
                  />
                  <label htmlFor="source-input" className="cursor-pointer">
                    <p className="text-slate-300 mb-2">
                      {sourceFile ? sourceFile.name : 'クリックして画像を選択'}
                    </p>
                    <p className="text-sm text-slate-400">JPG, PNG, WebP など</p>
                  </label>
                </div>
                <Button
                  onClick={handleUploadSource}
                  disabled={!sourceFile || uploadSourceMutation.isPending}
                  className="w-full"
                >
                  {uploadSourceMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      アップロード中...
                    </>
                  ) : (
                    'ソース画像をアップロード'
                  )}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-slate-800 border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">ステップ2: ターゲット動画をアップロード</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition">
                  <input
                    ref={targetInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleTargetFileChange}
                    className="hidden"
                    id="target-input"
                  />
                  <label htmlFor="target-input" className="cursor-pointer">
                    <p className="text-slate-300 mb-2">
                      {targetFile ? targetFile.name : 'クリックして動画を選択'}
                    </p>
                    <p className="text-sm text-slate-400">MP4, WebM, MOV など</p>
                  </label>
                </div>
                <Button
                  onClick={handleUploadTarget}
                  disabled={!targetFile || uploadTargetMutation.isPending}
                  className="w-full"
                >
                  {uploadTargetMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      アップロード中...
                    </>
                  ) : (
                    'ターゲット動画をアップロード'
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Local Process Tab */}
          <TabsContent value="local" className="space-y-6">
            <LocalProcessingTab
              sourceFileId={sourceFileId}
              targetFileId={targetFileId}
              onProcessingComplete={() => {
                setActiveTab('files');
                refreshFiles();
              }}
            />
          </TabsContent>

          {/* Cloud Processing Tab */}
          <TabsContent value="cloud">
            <CloudProcessingTab sourceFileId={sourceFileId} targetFileId={targetFileId} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">📁 アップロード済みファイル</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshFiles}
                  disabled={getFilesMutation.isPending}
                >
                  {getFilesMutation.isPending ? '読み込み中...' : '更新'}
                </Button>
              </div>

              {uploadedFiles.length === 0 ? (
                <p className="text-slate-400 text-center py-8">ファイルがアップロードされていません</p>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-slate-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{file.filename}</p>
                        <p className="text-sm text-slate-400">
                          {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {file.status && (
                          <p className="text-xs mt-1">
                            <span className={file.status === 'completed' ? 'text-green-400' : file.status === 'processing' ? 'text-yellow-400' : 'text-slate-400'}>
                              {file.status === 'completed' ? '✅ 完了' : file.status === 'processing' ? '⏳ 処理中' : file.status === 'uploaded' ? '📤 アップロード済み' : file.status}
                            </span>
                          </p>
                        )}
                      </div>
                      {file.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownloadResult(file.id)}
                          disabled={downloading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ⬇️ ダウンロード
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
