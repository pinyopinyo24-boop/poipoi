import React, { useEffect } from 'react';import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { DocumentPreview } from '@/components/DocumentPreview';
import { ProgressBar } from '@/components/ProgressBar';
import { CompletionAnimation } from '@/components/CompletionAnimation';
import { useProgress } from '@/hooks/useProgress';
import { useState } from 'react';

/**
 * AI生成ドキュメント作成ツール
 */
export function DocumentGenerator() {
  const progress = useProgress('ドキュメント生成中...');
  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedTab, setSelectedTab] = useState('excel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'excel' | 'powerpoint' | 'word'>('excel');

  // Excel生成
  const [excelDataType, setExcelDataType] = useState<'sales' | 'analytics' | 'report' | 'inventory' | 'custom'>('custom');
  const [excelRows, setExcelRows] = useState(10);
  const [excelColumns, setExcelColumns] = useState(5);

  // PowerPoint生成
  const [pptSlides, setPptSlides] = useState(5);
  const [pptTheme, setPptTheme] = useState<'professional' | 'creative' | 'minimal' | 'colorful'>('professional');

  // Word生成
  const [wordSections, setWordSections] = useState(3);

  // バッチ生成
  const [selectedFormats, setSelectedFormats] = useState<('excel' | 'powerpoint' | 'word')[]>(['excel']);

  // tRPC mutations
  const generateExcelMutation = trpc.documents.generateExcel.useMutation();
  const generatePptMutation = trpc.documents.generatePowerPoint.useMutation();
  const generateWordMutation = trpc.documents.generateWord.useMutation();
  const generateBatchMutation = trpc.documents.generateBatch.useMutation();

  const handlePreviewExcel = () => {
    if (!title || !description) {
      toast.error('Title and description are required');
      return;
    }
    setPreviewType('excel');
    setShowPreview(true);
  };

  const handleGenerateExcel = async () => {
    if (!title || !description) {
      toast.error('タイトルと説明を入力してください');
      return;
    }

    try {
      progress.start('Excel ドキュメント生成中...');
      const result = await generateExcelMutation.mutateAsync({
        title,
        description,
        dataType: excelDataType,
        rows: excelRows,
        columns: excelColumns,
        aiPrompt: aiPrompt || undefined,
      });

      progress.complete('Excel ドキュメント生成完了！');
      setShowCompletion(true);
      toast.success(result.message);
      if (result.data.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (error) {
      progress.reset();
      toast.error('Excel生成に失敗しました');
    }
  };

  const handlePreviewPowerPoint = () => {
    if (!title || !description) {
      toast.error('タイトルと説明を入力してください');
      return;
    }
    setPreviewType('powerpoint');
    setShowPreview(true);
  };

  const handleGeneratePowerPoint = async () => {
    if (!title || !description) {
      toast.error('タイトルと説明を入力してください');
      return;
    }

    try {
      progress.start('PowerPoint ドキュメント生成中...');
      const result = await generatePptMutation.mutateAsync({
        title,
        description,
        slides: pptSlides,
        theme: pptTheme,
        aiPrompt: aiPrompt || undefined,
      });

      progress.complete('PowerPoint ドキュメント生成完了！');
      setShowCompletion(true);
      toast.success(result.message);
      if (result.data.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (error) {
      progress.reset();
      toast.error('PowerPoint生成に失敗しました');
    }
  };

  const handleGenerateWord = async () => {
    if (!title || !description) {
      toast.error('タイトルと説明を入力してください');
      return;
    }

    try {
      progress.start('Word ドキュメント生成中...');
      const result = await generateWordMutation.mutateAsync({
        title,
        description,
        sections: wordSections,
        aiPrompt: aiPrompt || undefined,
      });

      progress.complete('Word ドキュメント生成完了！');
      setShowCompletion(true);
      toast.success(result.message);
      if (result.data.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (error) {
      progress.reset();
      toast.error('Word生成に失敗しました');
    }
  };

  const handleGenerateBatch = async () => {
    if (!title || !description) {
      toast.error('タイトルと説明を入力してください');
      return;
    }

    if (selectedFormats.length === 0) {
      toast.error('少なくとも1つのフォーマットを選択してください');
      return;
    }

    try {
      const result = await generateBatchMutation.mutateAsync({
        title,
        description,
        formats: selectedFormats,
        aiPrompt: aiPrompt || undefined,
      });

      toast.success(result.message);

      // 生成されたファイルをダウンロード
      if (result.data.excel?.url) {
        window.open(result.data.excel.url, '_blank');
      }
      if (result.data.powerpoint?.url) {
        setTimeout(() => window.open(result.data.powerpoint?.url, '_blank'), 500);
      }
      if (result.data.word?.url) {
        setTimeout(() => window.open(result.data.word?.url, '_blank'), 1000);
      }
    } catch (error) {
      toast.error('バッチ生成に失敗しました');
    }
  };

  const toggleFormat = (format: 'excel' | 'powerpoint' | 'word') => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  if (showPreview) {
    return (
      <DocumentPreview
        type={previewType}
        title={title}
        topic={description}
        onGenerate={(preview) => {
          setShowPreview(false);
          if (previewType === 'excel') {
            handleGenerateExcel();
          } else if (previewType === 'powerpoint') {
            handleGeneratePowerPoint();
          } else {
            handleGenerateWord();
          }
        }}
        onCancel={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      {progress.progress > 0 && progress.progress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-40 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
          <ProgressBar
            progress={progress.progress}
            label={progress.message}
            showPercentage={true}
            variant="neon"
            size="md"
          />
        </div>
      )}

      {/* 完了アニメーション */}
      <CompletionAnimation
        isVisible={showCompletion}
        message="ドキュメント生成完了！"
        onComplete={() => setShowCompletion(false)}
      />

      <div>
        <h1 className="text-3xl font-bold">ドキュメント生成ツール</h1>
        <p className="text-muted-foreground mt-2">
          AIを使用してExcel、PowerPoint、Wordドキュメントを自動生成します
        </p>
      </div>

      {/* 共通入力フィールド */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>ドキュメントのタイトルと説明を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 2024年度売上分析レポート"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ドキュメントの内容について説明してください"
              className="mt-2 min-h-24"
            />
          </div>

          <div>
            <Label htmlFor="aiPrompt">カスタムAIプロンプト（オプション）</Label>
            <Textarea
              id="aiPrompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="AIに対する詳細な指示を入力してください（省略可能）"
              className="mt-2 min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* フォーマット別生成 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="excel">Excel</TabsTrigger>
          <TabsTrigger value="powerpoint">PowerPoint</TabsTrigger>
          <TabsTrigger value="word">Word</TabsTrigger>
          <TabsTrigger value="batch">一括生成</TabsTrigger>
        </TabsList>

        {/* Excel生成 */}
        <TabsContent value="excel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Excel生成設定</CardTitle>
              <CardDescription>スプレッドシートの設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataType">データタイプ</Label>
                  <select
                    id="dataType"
                    value={excelDataType}
                    onChange={(e) =>
                      setExcelDataType(
                        e.target.value as 'sales' | 'analytics' | 'report' | 'inventory' | 'custom'
                      )
                    }
                    className="w-full mt-2 px-3 py-2 border rounded-lg"
                  >
                    <option value="sales">売上データ</option>
                    <option value="analytics">分析データ</option>
                    <option value="report">レポート</option>
                    <option value="inventory">在庫管理</option>
                    <option value="custom">カスタム</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="rows">行数: {excelRows}</Label>
                  <input
                    id="rows"
                    type="range"
                    min="5"
                    max="100"
                    value={excelRows}
                    onChange={(e) => setExcelRows(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="columns">列数: {excelColumns}</Label>
                  <input
                    id="columns"
                    type="range"
                    min="3"
                    max="20"
                    value={excelColumns}
                    onChange={(e) => setExcelColumns(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePreviewExcel}
                  variant="outline"
                  className="flex-1"
                >
                  プレビュー
                </Button>
                <Button
                  onClick={handleGenerateExcel}
                  disabled={generateExcelMutation.isPending}
                  className="flex-1"
                >
                  {generateExcelMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      生成中...
                    </>
                  ) : (
                    'Excelを生成'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PowerPoint生成 */}
        <TabsContent value="powerpoint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PowerPoint生成設定</CardTitle>
              <CardDescription>プレゼンテーションの設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slides">スライド数: {pptSlides}</Label>
                  <input
                    id="slides"
                    type="range"
                    min="3"
                    max="20"
                    value={pptSlides}
                    onChange={(e) => setPptSlides(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="theme">テーマ</Label>
                  <select
                    id="theme"
                    value={pptTheme}
                    onChange={(e) =>
                      setPptTheme(e.target.value as 'professional' | 'creative' | 'minimal' | 'colorful')
                    }
                    className="w-full mt-2 px-3 py-2 border rounded-lg"
                  >
                    <option value="professional">プロフェッショナル</option>
                    <option value="creative">クリエイティブ</option>
                    <option value="minimal">ミニマル</option>
                    <option value="colorful">カラフル</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePreviewPowerPoint}
                  variant="outline"
                  className="flex-1"
                >
                  プレビュー
                </Button>
                <Button
                  onClick={handleGeneratePowerPoint}
                  disabled={generatePptMutation.isPending}
                  className="flex-1"
                >
                  {generatePptMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      生成中...
                    </>
                  ) : (
                    'PowerPointを生成'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Word生成 */}
        <TabsContent value="word" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Word生成設定</CardTitle>
              <CardDescription>ドキュメントの設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sections">セクション数: {wordSections}</Label>
                <input
                  id="sections"
                  type="range"
                  min="2"
                  max="10"
                  value={wordSections}
                  onChange={(e) => setWordSections(parseInt(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!title || !description) {
                      toast.error('Title and description are required');
                      return;
                    }
                    setPreviewType('word');
                    setShowPreview(true);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  プレビュー
                </Button>
                <Button
                  onClick={handleGenerateWord}
                  disabled={generateWordMutation.isPending}
                  className="flex-1"
                >
                  {generateWordMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      生成中...
                    </>
                  ) : (
                    'Wordを生成'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 一括生成 */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>一括生成設定</CardTitle>
              <CardDescription>複数のフォーマットを同時に生成します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>生成するフォーマット</Label>
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes('excel')}
                      onChange={() => toggleFormat('excel')}
                      className="w-4 h-4"
                    />
                    <span>Excel</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes('powerpoint')}
                      onChange={() => toggleFormat('powerpoint')}
                      className="w-4 h-4"
                    />
                    <span>PowerPoint</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes('word')}
                      onChange={() => toggleFormat('word')}
                      className="w-4 h-4"
                    />
                    <span>Word</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  選択中: {selectedFormats.length > 0 ? selectedFormats.join(', ') : 'なし'}
                </p>
              </div>

              <Button
                onClick={handleGenerateBatch}
                disabled={generateBatchMutation.isPending || selectedFormats.length === 0}
                className="w-full"
              >
                {generateBatchMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    生成中...
                  </>
                ) : (
                  `${selectedFormats.length}個のドキュメントを生成`
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 情報 */}
      <Card>
        <CardHeader>
          <CardTitle>使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. 基本情報を入力:</strong> タイトルと説明を入力してください。AIがこれに基づいてコンテンツを生成します。
          </p>
          <p>
            <strong>2. フォーマットを選択:</strong> 生成したいドキュメント形式を選択します。
          </p>
          <p>
            <strong>3. 設定を調整:</strong> 各フォーマットに応じた詳細設定を行います。
          </p>
          <p>
            <strong>4. 生成実行:</strong> 「生成」ボタンをクリックするとAIが自動的にドキュメントを作成します。
          </p>
          <p>
            <strong>5. ダウンロード:</strong> 生成されたファイルは自動的にダウンロードされます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DocumentGenerator;
