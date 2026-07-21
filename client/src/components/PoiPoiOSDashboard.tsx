/**
 * PoiPoi OS Dashboard - Command Center UI
 * 🦝 AI・ビジネスエンジン統合管理画面
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Brain, Cog, TrendingUp, Clock, Activity, Loader2, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Status Badge Component
function StatusBadge({ status }: { status: 'idle' | 'processing' | 'completed' | 'failed' | 'waiting' }) {
  const statusConfig = {
    idle: { icon: CheckCircle, label: 'アイドル', color: 'bg-green-100 text-green-800' },
    processing: { icon: Loader2, label: '処理中', color: 'bg-blue-100 text-blue-800' },
    completed: { icon: CheckCircle, label: '完了', color: 'bg-green-100 text-green-800' },
    failed: { icon: AlertCircle, label: 'エラー', color: 'bg-red-100 text-red-800' },
    waiting: { icon: Clock, label: '待機中', color: 'bg-yellow-100 text-yellow-800' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      <Icon className={`w-3 h-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

// Provider Status Card
function ProviderStatusCard({ providerType, status }: { providerType: string; status: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm capitalize">{providerType}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {providerType === 'gemini' ? '🔵 Google Gemini' : '🟢 OpenAI ChatGPT'}
              </p>
            </div>
            <StatusBadge status={status?.isAvailable ? 'completed' : 'failed'} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">モデル数</p>
              <p className="font-semibold">{status?.modelsAvailable || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">最終確認</p>
              <p className="font-semibold text-xs">
                {status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString('ja-JP') : '-'}
              </p>
            </div>
          </div>

          {status?.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              {status.errorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Agent Status Card
function AgentStatusCard({ agentType, status }: { agentType: string; status: string }) {
  const agentLabels: Record<string, string> = {
    design: '🎨 デザインAgent',
    implementation: '💻 実装Agent',
    review: '👀 レビューAgent',
    task: '✅ タスクAgent',
    coordinator: '🎯 コーディネーター',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{agentLabels[agentType] || agentType}</h3>
              <p className="text-xs text-muted-foreground mt-1">AI エージェント</p>
            </div>
            <StatusBadge status={status as any} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Workflow Result Display
function WorkflowResultDisplay({ result }: { result: any }) {
  if (!result) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg">🔄 ワークフロー実行結果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">ステータス</p>
            <p className="font-semibold capitalize">{result.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ステップ数</p>
            <p className="font-semibold">{result.stepCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">実行時間</p>
            <p className="font-semibold">{result.executionTime}ms</p>
          </div>
          <div>
            <p className="text-muted-foreground">トークン使用</p>
            <p className="font-semibold">{result.totalTokensUsed}</p>
          </div>
        </div>

        {result.aggregatedResults && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">📊 各Agent の返答:</h4>
            {Object.entries(result.aggregatedResults).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-white border rounded p-3 text-sm">
                <p className="font-semibold text-blue-700 mb-2">{key}:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
              </div>
            ))}
          </div>
        )}

        {result.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            <p className="font-semibold">エラー:</p>
            <p>{result.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function PoiPoiOSDashboard() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // tRPC queries
  const initializeMutation = trpc.aiAgents.initialize.useMutation();
  const systemStatusQuery = trpc.aiAgents.getSystemStatus.useQuery(undefined, { enabled: initialized });
  const providerStatusesQuery = trpc.aiAgents.getProviderStatuses.useQuery(undefined, { enabled: initialized });
  const agentStatusesQuery = trpc.aiAgents.getAgentStatuses.useQuery(undefined, { enabled: initialized });
  const executeWorkflowMutation = trpc.aiAgents.executeWorkflow.useMutation();

  // Initialize AI Core on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await initializeMutation.mutateAsync();
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize AI Core:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (!initialized) return;

    const interval = setInterval(() => {
      systemStatusQuery.refetch();
      providerStatusesQuery.refetch();
      agentStatusesQuery.refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [initialized]);

  // Handle workflow execution
  const handleExecuteWorkflow = async () => {
    if (!inputText.trim()) return;

    setIsExecuting(true);
    try {
      const result = await executeWorkflowMutation.mutateAsync({
        workflowId: `workflow-${Date.now()}`,
        steps: [
          {
            agentType: 'task',
            description: 'ユーザー入力を処理',
            input: { userInput: inputText },
          },
          {
            agentType: 'implementation',
            description: 'ChatGPT で返答を生成',
            input: { message: inputText, provider: 'chatgpt' },
            dependsOn: ['task'],
          },
          {
            agentType: 'design',
            description: 'Gemini で返答を生成',
            input: { message: inputText, provider: 'gemini' },
            dependsOn: ['task'],
          },
          {
            agentType: 'review',
            description: 'ReviewAgent が両方の返答をレビュー',
            input: { message: inputText },
            dependsOn: ['implementation', 'design'],
          },
        ],
      });

      setWorkflowResult(result);
      setInputText('');
    } catch (error) {
      console.error('Workflow execution failed:', error);
      setWorkflowResult({
        status: 'failed',
        error: error instanceof Error ? error.message : 'ワークフロー実行に失敗しました',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const systemStatus = systemStatusQuery.data;
  const providerStatuses = providerStatusesQuery.data || {};
  const agentStatuses = agentStatusesQuery.data || {};

  // Memory statistics query
  const memorySummaryQuery = trpc.agentMemory.getMemorySummary.useQuery(undefined, { enabled: initialized });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">AI Core を初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🦝 PoiPoi OS ダッシュボード</h1>
        <p className="text-muted-foreground">AI エージェント統合管理センター</p>
      </div>

      {/* System Overview */}
      {systemStatus && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              システム状態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">初期化状態</p>
                <p className="text-2xl font-bold text-green-600">✓ 準備完了</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">プロバイダー</p>
                <p className="text-2xl font-bold">{systemStatus.providers?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">主プロバイダー</p>
                <p className="text-lg font-bold capitalize">{systemStatus.primaryProvider || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最終更新</p>
                <p className="text-sm">{new Date().toLocaleTimeString('ja-JP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Input Section */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg">💬 Agent ワークフロー実行</CardTitle>
          <CardDescription>メッセージを入力して、複数の Agent に処理させます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleExecuteWorkflow()}
              placeholder="例: こんにちは、PoiPoi について教えてください"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isExecuting}
            />
            <Button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !inputText.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isExecuting ? '実行中...' : '実行'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ℹ️ 入力したメッセージは TaskAgent → ImplementationAgent (ChatGPT) → DesignAgent (Gemini) → ReviewAgent の順で処理されます
          </p>
        </CardContent>
      </Card>

      {/* Workflow Result */}
      {workflowResult && <WorkflowResultDisplay result={workflowResult} />}

      {/* Providers Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-4">🔌 AI プロバイダー</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(providerStatuses).map(([providerType, status]) => (
              <ProviderStatusCard key={providerType} providerType={providerType} status={status} />
            ))}
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-4">🤖 AI エージェント</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(agentStatuses).map(([agentType, status]) => (
              <AgentStatusCard key={agentType} agentType={agentType} status={status as string} />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                systemStatusQuery.refetch();
                providerStatusesQuery.refetch();
                agentStatusesQuery.refetch();
              }}
              disabled={systemStatusQuery.isLoading}
            >
              <Zap className="w-4 h-4 mr-2" />
              {systemStatusQuery.isLoading ? '更新中...' : '状態を更新'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {initializeMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">初期化エラー</h3>
                <p className="text-sm text-red-700 mt-1">
                  {initializeMutation.error?.message || 'AI Core の初期化に失敗しました'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
