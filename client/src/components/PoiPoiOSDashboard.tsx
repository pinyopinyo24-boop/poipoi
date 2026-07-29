/**
 * PoiPoi OS Dashboard - Command Center UI
 * 🦝 AI・ビジネスエンジン統合管理画面
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Brain, Cog, TrendingUp, Clock, Activity, Loader2, Send, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Status Badge Component
function StatusBadge({ status }: { status: 'idle' | 'processing' | 'completed' | 'failed' | 'waiting' | 'pending' | 'analyzing' | 'designing' | 'implementing' | 'reviewing' }) {
  const statusConfig: Record<string, any> = {
    idle: { icon: CheckCircle, label: 'アイドル', color: 'bg-green-100 text-green-800' },
    processing: { icon: Loader2, label: '処理中', color: 'bg-blue-100 text-blue-800' },
    completed: { icon: CheckCircle, label: '完了', color: 'bg-green-100 text-green-800' },
    failed: { icon: AlertCircle, label: 'エラー', color: 'bg-red-100 text-red-800' },
    waiting: { icon: Clock, label: '待機中', color: 'bg-yellow-100 text-yellow-800' },
    pending: { icon: Clock, label: '保留中', color: 'bg-gray-100 text-gray-800' },
    analyzing: { icon: Brain, label: '分析中', color: 'bg-blue-100 text-blue-800' },
    designing: { icon: Cog, label: 'デザイン中', color: 'bg-purple-100 text-purple-800' },
    implementing: { icon: Zap, label: '実装中', color: 'bg-orange-100 text-orange-800' },
    reviewing: { icon: CheckCircle, label: 'レビュー中', color: 'bg-cyan-100 text-cyan-800' },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      <Icon className={`w-3 h-3 mr-1 ${(status === 'processing' || status === 'analyzing' || status === 'designing' || status === 'implementing' || status === 'reviewing') ? 'animate-spin' : ''}`} />
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

// Workflow Progress Display
function WorkflowProgressDisplay({ workflow }: { workflow: any }) {
  if (!workflow) return null;

  const steps = ['analyzing', 'designing', 'implementing', 'reviewing', 'completed'];
  const currentStepIndex = steps.indexOf(workflow.state);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg">⚙️ ワークフロー進行状況</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">進捗</span>
            <span className="text-muted-foreground">{Math.round((currentStepIndex / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStepIndex / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Timeline */}
        <div className="space-y-2">
          {workflow.steps && workflow.steps.map((step: any, index: number) => (
            <div key={step.id} className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white border-2 border-blue-600">
                {step.state === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : step.state === 'failed' ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold capitalize">{step.agentType} Agent</p>
                <p className="text-xs text-muted-foreground">{step.duration || 0}ms</p>
              </div>
              <StatusBadge status={step.state} />
              {step.error && (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 bg-white rounded p-3 text-sm border">
          <div>
            <p className="text-muted-foreground text-xs">成功率</p>
            <p className="font-semibold">{workflow.successRate?.toFixed(1) || 0}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">実行時間</p>
            <p className="font-semibold">{workflow.duration || 0}ms</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">トークン使用</p>
            <p className="font-semibold">{workflow.totalTokensUsed || 0}</p>
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
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-lg">✅ ワークフロー実行完了</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">ステータス</p>
            <p className="font-semibold capitalize">{result.state}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ステップ数</p>
            <p className="font-semibold">{result.steps?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">実行時間</p>
            <p className="font-semibold">{result.duration || 0}ms</p>
          </div>
          <div>
            <p className="text-muted-foreground">成功率</p>
            <p className="font-semibold">{result.successRate?.toFixed(1) || 0}%</p>
          </div>
        </div>

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

// Workflow History Display
function WorkflowHistoryDisplay({ workflows }: { workflows: any[] }) {
  if (!workflows || workflows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          実行履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {workflows.slice(0, 10).map((workflow: any) => (
            <div key={workflow.workflowId} className="flex items-center justify-between p-2 border rounded bg-gray-50 text-sm">
              <div className="flex-1">
                <p className="font-semibold capitalize">{workflow.state}</p>
                <p className="text-xs text-muted-foreground">{workflow.userInput?.substring(0, 50)}...</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>{workflow.duration}ms</span>
                <span>{workflow.successRate?.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function PoiPoiOSDashboard() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // tRPC queries
  const initializeMutation = trpc.aiAgents.initialize.useMutation();
  const systemStatusQuery = trpc.aiAgents.getSystemStatus.useQuery(undefined, { enabled: initialized });
  const providerStatusesQuery = trpc.aiAgents.getProviderStatuses.useQuery(undefined, { enabled: initialized });
  const agentStatusesQuery = trpc.aiAgents.getAgentStatuses.useQuery(undefined, { enabled: initialized });
  const executeWorkflowMutation = trpc.aiAgents.executeWorkflow.useMutation();
  const workflowHistoryQuery = trpc.agentMemory.getMemorySummary.useQuery(undefined, { enabled: initialized });

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
      workflowHistoryQuery.refetch();
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
            agentType: 'design',
            description: 'デザイン生成',
            input: { userInput: inputText },
            dependsOn: ['task'],
          },
          {
            agentType: 'implementation',
            description: '実装生成',
            input: { userInput: inputText },
            dependsOn: ['design'],
          },
          {
            agentType: 'review',
            description: 'レビュー実行',
            input: { userInput: inputText },
            dependsOn: ['implementation'],
          },
        ],
      });

      setCurrentWorkflow(result);
      setWorkflowResult(result);
      setInputText('');
      
      // Refresh history
      // workflowHistoryQuery.refetch();
    } catch (error) {
      console.error('Workflow execution failed:', error);
      setWorkflowResult({
        state: 'failed',
        error: error instanceof Error ? error.message : 'ワークフロー実行に失敗しました',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const systemStatus = systemStatusQuery.data;
  const providerStatuses = providerStatusesQuery.data || {};
  const agentStatuses = agentStatusesQuery.data || {};
  const workflowHistory = (Array.isArray(workflowHistoryQuery.data) ? workflowHistoryQuery.data : []) || [];

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
            ℹ️ 入力したメッセージは TaskAgent → DesignAgent → ImplementationAgent → ReviewAgent の順で処理されます
          </p>
        </CardContent>
      </Card>

      {/* Workflow Progress */}
      {currentWorkflow && currentWorkflow.state !== 'completed' && (
        <WorkflowProgressDisplay workflow={currentWorkflow} />
      )}

      {/* Workflow Result */}
      {workflowResult && workflowResult.state === 'completed' && (
        <WorkflowResultDisplay result={workflowResult} />
      )}

      {/* Workflow History */}
      {Array.isArray(workflowHistory) && <WorkflowHistoryDisplay workflows={workflowHistory} />}

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
