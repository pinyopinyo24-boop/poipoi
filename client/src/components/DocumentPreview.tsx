import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { PreviewAIAssistant } from './PreviewAIAssistant';

interface DocumentPreviewProps {
  type: 'excel' | 'powerpoint' | 'word';
  title: string;
  topic: string;
  onGenerate: (preview: any) => void;
  onCancel: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  type,
  title,
  topic,
  onGenerate,
  onCancel,
}) => {
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Generate preview
  const generatePreview = async () => {
    setIsLoading(true);
    try {
      let result;
      if (type === 'excel') {
        result = await trpc.preview.excelGeneratePreview.useMutation().mutateAsync({
          title,
          topic,
          rows: 10,
          columns: 5,
        });
      } else if (type === 'powerpoint') {
        result = await trpc.preview.powerpointGeneratePreview.useMutation().mutateAsync({
          title,
          topic,
          slides: 5,
          theme: 'modern',
        });
      } else {
        result = await trpc.preview.wordGeneratePreview.useMutation().mutateAsync({
          title,
          topic,
          sections: 3,
        });
      }
      setPreview(result);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate preview
  const validatePreview = async () => {
    if (!preview) return;
    try {
      let result;
      if (type === 'excel') {
        result = await trpc.preview.excelValidatePreview.useMutation().mutateAsync({ preview });
      } else if (type === 'powerpoint') {
        result = await trpc.preview.powerpointValidatePreview.useMutation().mutateAsync({ preview });
      } else {
        result = await trpc.preview.wordValidatePreview.useMutation().mutateAsync({ preview });
      }
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate preview:', error);
    }
  };

  // Handle text selection for AI assistant
  const handleTextSelection = () => {
    const selectedText = window.getSelection()?.toString() || '';
    if (selectedText.length > 0) {
      setSelectedText(selectedText);
      setShowAIAssistant(true);
    }
  };

  // Apply AI processed text
  const handleApplyAIText = (processedText: string) => {
    if (type === 'excel' && preview) {
      setPreview({
        ...preview,
        sheets: preview.sheets?.map((sheet: any) => ({
          ...sheet,
          content: processedText
        }))
      });
    } else if (type === 'powerpoint' && preview) {
      setPreview({
        ...preview,
        slides: preview.slides?.map((slide: any) => ({
          ...slide,
          content: processedText
        }))
      });
    } else if (type === 'word' && preview) {
      setPreview({
        ...preview,
        content: processedText
      });
    }
  };

  // Render Excel preview
  const renderExcelPreview = () => {
    if (!preview) return null;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">メタデータ</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">作成者:</span> {preview.metadata?.author}
            </div>
            <div>
              <span className="text-gray-600">作成日:</span> {preview.metadata?.createdDate}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">シート一覧</h4>
          <div className="space-y-2">
            {preview.sheets?.map((sheet: any, idx: number) => (
              <Card key={idx} className="p-3 cursor-text hover:bg-blue-50 transition" onMouseUp={handleTextSelection}>
                <div className="font-medium">{sheet.name}</div>
                <div className="text-sm text-gray-600">
                  {sheet.rows?.length || 0} 行 × {sheet.columns || 0} 列
                </div>
                {sheet.content && (
                  <div className="text-sm mt-2 p-2 bg-gray-50 rounded line-clamp-3">
                    {sheet.content}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {editMode && (
          <div className="space-y-2">
            <h4 className="font-semibold">シート追加</h4>
            <div className="flex gap-2">
              <Input placeholder="シート名" className="flex-1" />
              <Button size="sm">追加</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render PowerPoint preview
  const renderPowerPointPreview = () => {
    if (!preview) return null;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">メタデータ</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">テーマ:</span> {preview.theme}
            </div>
            <div>
              <span className="text-gray-600">スライド数:</span> {preview.slides?.length || 0}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">スライド一覧</h4>
          <ScrollArea className="h-64 border rounded p-3">
            <div className="space-y-2">
              {preview.slides?.map((slide: any, idx: number) => (
                <Card key={idx} className="p-3 cursor-text hover:bg-blue-50 transition" onMouseUp={handleTextSelection}>
                  <div className="font-medium">スライド {slide.slideNumber}</div>
                  <div className="text-sm font-semibold mt-1">{slide.title}</div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{slide.content}</div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {editMode && (
          <div className="space-y-2">
            <h4 className="font-semibold">スライド追加</h4>
            <div className="flex gap-2">
              <Input placeholder="スライドタイトル" className="flex-1" />
              <Button size="sm">追加</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Word preview
  const renderWordPreview = () => {
    if (!preview) return null;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">メタデータ</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">作成者:</span> {preview.metadata?.author}
            </div>
            <div>
              <span className="text-gray-600">セクション数:</span> {preview.sections?.length || 0}
            </div>
          </div>
        </div>

        {preview.tableOfContents && (
          <div>
            <h4 className="font-semibold mb-2">目次</h4>
            <ul className="text-sm space-y-1">
              {preview.tableOfContents.map((item: string, idx: number) => (
                <li key={idx} className="text-gray-600">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">セクション一覧</h4>
          <ScrollArea className="h-64 border rounded p-3">
            <div className="space-y-2">
              {preview.sections?.map((section: any, idx: number) => (
                <Card key={idx} className="p-3 cursor-text hover:bg-blue-50 transition" onMouseUp={handleTextSelection}>
                  <div className="font-medium" style={{ marginLeft: `${(section.level - 1) * 1}rem` }}>
                    {section.heading}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{section.content}</div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {editMode && (
          <div className="space-y-2">
            <h4 className="font-semibold">セクション追加</h4>
            <div className="flex gap-2">
              <Input placeholder="セクション見出し" className="flex-1" />
              <Button size="sm">追加</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>ドキュメントプレビュー</CardTitle>
        <CardDescription>テキストを選択してAIアシスタントで改善できます</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {isLoading ? (
              <>
                <Spinner />
                <p className="text-gray-600">プレビューを生成中...</p>
              </>
            ) : (
              <>
                <p className="text-gray-600">プレビューを生成してください</p>
                <Button onClick={generatePreview} disabled={isLoading}>
                  プレビュー生成
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
                <TabsTrigger value="edit">編集</TabsTrigger>
                <TabsTrigger value="validate">検証</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                {type === 'excel' && renderExcelPreview()}
                {type === 'powerpoint' && renderPowerPointPreview()}
                {type === 'word' && renderWordPreview()}
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">コンテンツ編集</h4>
                  <Textarea
                    placeholder="編集内容を入力..."
                    className="min-h-32"
                    defaultValue={JSON.stringify(preview, null, 2)}
                  />
                  <Button onClick={() => setEditMode(!editMode)}>
                    {editMode ? '編集完了' : '編集開始'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="validate" className="space-y-4">
                <Button onClick={validatePreview} className="w-full">
                  検証実行
                </Button>
                {validationResult && (
                  <Card className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={validationResult.isValid ? 'default' : 'destructive'}>
                          {validationResult.isValid ? '検証OK' : '検証NG'}
                        </Badge>
                      </div>
                      {validationResult.issues?.length > 0 && (
                        <ul className="text-sm space-y-1">
                          {validationResult.issues.map((issue: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => onGenerate(preview)} className="flex-1" variant="default">
                このプレビューで生成
              </Button>
              <Button onClick={onCancel} variant="outline">
                キャンセル
              </Button>
            </div>

            {showAIAssistant && (
              <PreviewAIAssistant
                selectedText={selectedText}
                onTextApply={handleApplyAIText}
                onClose={() => setShowAIAssistant(false)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
