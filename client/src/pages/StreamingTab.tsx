import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';

export function StreamingTab() {
  const [streamType, setStreamType] = useState<'text' | 'code' | 'translation' | 'summary'>('text');
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamOutput, setStreamOutput] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');

  const handleStream = async () => {
    if (!prompt.trim()) return;

    setIsStreaming(true);
    setStreamOutput('');

    try {
      // tRPCでストリーミング実行
      // 注: 実装は既存のストリーミング機能を使用
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: streamType,
          prompt,
          targetLanguage,
          summaryLength,
        }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setStreamOutput((prev) => prev + chunk);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamOutput('エラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ストリーミング処理</CardTitle>
          <CardDescription>リアルタイムでAI処理結果を表示します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={streamType} onValueChange={(v) => setStreamType(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text">テキスト生成</TabsTrigger>
              <TabsTrigger value="code">コード生成</TabsTrigger>
              <TabsTrigger value="translation">翻訳</TabsTrigger>
              <TabsTrigger value="summary">要約</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <label className="text-sm font-medium">プロンプト</label>
                <Textarea
                  placeholder="生成したいテキストについて説明してください"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div>
                <label className="text-sm font-medium">コード要件</label>
                <Textarea
                  placeholder="生成したいコードの要件を説明してください"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="translation" className="space-y-4">
              <div>
                <label className="text-sm font-medium">翻訳対象テキスト</label>
                <Textarea
                  placeholder="翻訳したいテキストを入力してください"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">対象言語</label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">英語</SelectItem>
                    <SelectItem value="Japanese">日本語</SelectItem>
                    <SelectItem value="Chinese">中国語</SelectItem>
                    <SelectItem value="Spanish">スペイン語</SelectItem>
                    <SelectItem value="French">フランス語</SelectItem>
                    <SelectItem value="German">ドイツ語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div>
                <label className="text-sm font-medium">要約対象テキスト</label>
                <Textarea
                  placeholder="要約したいテキストを入力してください"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">要約の長さ</label>
                <Select value={summaryLength} onValueChange={(v) => setSummaryLength(v as any)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">短い（1-2段落）</SelectItem>
                    <SelectItem value="medium">中程度（3-4段落）</SelectItem>
                    <SelectItem value="long">長い（5-6段落）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleStream}
            disabled={isStreaming || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isStreaming ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                処理中...
              </>
            ) : (
              'ストリーミング開始'
            )}
          </Button>
        </CardContent>
      </Card>

      {streamOutput && (
        <Card>
          <CardHeader>
            <CardTitle>ストリーミング結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {streamOutput}
              {isStreaming && <span className="animate-pulse">▌</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StreamingTab;
