import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface PreviewAIAssistantProps {
  selectedText: string;
  onTextApply: (text: string) => void;
  onClose: () => void;
}

export const PreviewAIAssistant: React.FC<PreviewAIAssistantProps> = ({
  selectedText,
  onTextApply,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'operations' | 'results'>('operations');
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // tRPC mutations
  const summarizeMutation = trpc.aiAssistant.summarizeText.useMutation();
  const refineMutation = trpc.aiAssistant.refineText.useMutation();
  const expandMutation = trpc.aiAssistant.expandText.useMutation();
  const simplifyMutation = trpc.aiAssistant.simplifyText.useMutation();
  const adjustToneMutation = trpc.aiAssistant.adjustTone.useMutation();
  const grammarMutation = trpc.aiAssistant.checkGrammar.useMutation();
  const keywordsMutation = trpc.aiAssistant.extractKeywords.useMutation();
  const sentimentMutation = trpc.aiAssistant.analyzeSentiment.useMutation();

  const handleOperation = async (
    operation: 'summarize' | 'refine' | 'expand' | 'simplify' | 'tone' | 'grammar' | 'keywords' | 'sentiment',
    params?: any
  ) => {
    try {
      let result;

      switch (operation) {
        case 'summarize':
          result = await summarizeMutation.mutateAsync({
            text: selectedText,
            level: params?.level || 'medium'
          });
          break;
        case 'refine':
          result = await refineMutation.mutateAsync({
            text: selectedText,
            style: params?.style || 'formal',
            tone: params?.tone || 'professional'
          });
          break;
        case 'expand':
          result = await expandMutation.mutateAsync({
            text: selectedText,
            targetLength: params?.targetLength || 'medium',
            focusArea: params?.focusArea
          });
          break;
        case 'simplify':
          result = await simplifyMutation.mutateAsync({
            text: selectedText,
            targetAudience: params?.targetAudience || '一般的な読者'
          });
          break;
        case 'tone':
          result = await adjustToneMutation.mutateAsync({
            text: selectedText,
            targetTone: params?.targetTone || 'professional'
          });
          break;
        case 'grammar':
          result = await grammarMutation.mutateAsync({
            text: selectedText
          });
          break;
        case 'keywords':
          result = await keywordsMutation.mutateAsync({
            text: selectedText,
            count: params?.count || 5
          });
          break;
        case 'sentiment':
          result = await sentimentMutation.mutateAsync({
            text: selectedText
          });
          break;
      }

      if (result) {
        setResults([...results, result]);
        setActiveTab('results');
        toast.success(`${operation}処理が完了しました`);
      }
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      toast.error(`${operation}処理に失敗しました`);
    }
  };

  const handleApplyResult = (result: any) => {
    if (result.processedText) {
      onTextApply(result.processedText);
      toast.success('テキストが適用されました');
      onClose();
    } else if (result.keywords) {
      onTextApply(result.keywords.join(', '));
      toast.success('キーワードが適用されました');
      onClose();
    }
  };

  const isLoading = 
    summarizeMutation.isPending ||
    refineMutation.isPending ||
    expandMutation.isPending ||
    simplifyMutation.isPending ||
    adjustToneMutation.isPending ||
    grammarMutation.isPending ||
    keywordsMutation.isPending ||
    sentimentMutation.isPending;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIアシスタント</DialogTitle>
          <DialogDescription>
            選択したテキストを分析・改善します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 選択テキスト表示 */}
          <Card className="bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm">選択テキスト</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 line-clamp-3">{selectedText}</p>
            </CardContent>
          </Card>

          {/* タブ */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'operations'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              操作
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              結果 ({results.length})
            </button>
          </div>

          {/* 操作タブ */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              {/* テキスト処理操作 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">テキスト処理</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleOperation('summarize', { level: 'medium' })}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {summarizeMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      要約
                    </Button>
                    <Button
                      onClick={() => handleOperation('refine')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {refineMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      ブラッシュアップ
                    </Button>
                    <Button
                      onClick={() => handleOperation('expand')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {expandMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      拡張
                    </Button>
                    <Button
                      onClick={() => handleOperation('simplify')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {simplifyMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      簡潔化
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* トーン調整 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">トーン調整</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(['professional', 'friendly', 'authoritative', 'conversational', 'humorous'] as const).map(
                      (tone) => (
                        <Button
                          key={tone}
                          onClick={() => handleOperation('tone', { targetTone: tone })}
                          disabled={isLoading || adjustToneMutation.isPending}
                          variant="outline"
                          size="sm"
                        >
                          {adjustToneMutation.isPending ? (
                            <Spinner className="mr-2 h-3 w-3" />
                          ) : null}
                          {tone === 'professional' && 'プロフェッショナル'}
                          {tone === 'friendly' && 'フレンドリー'}
                          {tone === 'authoritative' && '権威的'}
                          {tone === 'conversational' && '会話的'}
                          {tone === 'humorous' && 'ユーモア'}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 分析操作 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">分析</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleOperation('grammar')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {grammarMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      文法チェック
                    </Button>
                    <Button
                      onClick={() => handleOperation('keywords')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {keywordsMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      キーワード抽出
                    </Button>
                    <Button
                      onClick={() => handleOperation('sentiment')}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {sentimentMutation.isPending ? (
                        <Spinner className="mr-2 h-3 w-3" />
                      ) : null}
                      センチメント分析
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 結果タブ */}
          {activeTab === 'results' && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  まだ結果がありません
                </p>
              ) : (
                results.map((result, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader
                      onClick={() => setSelectedResult(selectedResult === index ? null : index)}
                      className="pb-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm">
                            {result.type === 'summary' && '要約'}
                            {result.type === 'refinement' && 'ブラッシュアップ'}
                            {result.type === 'expansion' && '拡張'}
                            {result.type === 'simplification' && '簡潔化'}
                            {result.type === 'tone-adjustment' && 'トーン調整'}
                            {result.type === 'grammar-check' && '文法チェック'}
                            {!result.type && '分析結果'}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {result.explanation}
                          </CardDescription>
                        </div>
                        {result.processedText && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyResult(result);
                            }}
                            size="sm"
                            className="ml-2"
                          >
                            適用
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {selectedResult === index && (
                      <CardContent className="space-y-2">
                        {result.processedText && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">処理後のテキスト:</p>
                            <p className="text-sm bg-blue-50 p-2 rounded line-clamp-4">
                              {result.processedText}
                            </p>
                          </div>
                        )}
                        {result.keywords && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">キーワード:</p>
                            <div className="flex flex-wrap gap-1">
                              {result.keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.sentiment && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">センチメント:</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                result.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                result.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {result.sentiment === 'positive' && 'ポジティブ'}
                                {result.sentiment === 'negative' && 'ネガティブ'}
                                {result.sentiment === 'neutral' && 'ニュートラル'}
                              </span>
                              <span className="text-xs text-gray-600">
                                信頼度: {(result.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{result.explanation}</p>
                          </div>
                        )}
                        {result.wordCountBefore && (
                          <div className="text-xs text-gray-500 border-t pt-2">
                            単語数: {result.wordCountBefore} → {result.wordCountAfter}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
